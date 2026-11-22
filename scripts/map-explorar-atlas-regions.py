"""Transfer BodyParts3D PART-OF labels to the decimated atlas triangles.

See src/content/anatomy/modelos/README.md for source files and usage.
"""

import argparse
import hashlib
from itertools import groupby
import json
from pathlib import Path
import struct
from zipfile import ZipFile

import numpy as np
from scipy.spatial import cKDTree


ROOT = Path(__file__).resolve().parent.parent
BODY = ROOT / 'assets/anatomy/body'
REGIONS = {
    'bones': {
        'skull': {
            'frontal': [52734], 'parietales': [52788, 52789], 'temporales': [52738, 52739],
            'occipital': [52735], 'cigomaticos': [52892, 52893], 'maxilares': [53649, 53650],
        },
        'spine': {'cervical': [24138], 'toracica': [9140], 'lumbar': [16203], 'sacro': [16202]},
    },
    'organs': {
        'brain': {'hemisferio_izquierdo': [61819], 'hemisferio_derecho': [67292], 'cerebelo': [67944], 'tronco': [79876]},
        'liver': {'derecha': [15809], 'izquierda': [15810], 'caudado': [13365]},
        'small_intestine': {'duodeno': [7206], 'yeyuno': [7207], 'ileon': [7208]},
        'large_intestine': {'ciego': [14541], 'ascendente': [14545], 'transverso': [14546], 'descendente': [14547], 'recto': [14544]},
    },
}


def read_mesh(data, binary, node_id):
    node = next(node for node in data['nodes'] if node['name'] == node_id)
    (primitive,) = data['meshes'][node['mesh']]['primitives']

    def accessor(index, columns):
        entry = data['accessors'][index]
        view = data['bufferViews'][entry['bufferView']]
        dtype = np.dtype({5123: '<u2', 5125: '<u4', 5126: '<f4'}[entry['componentType']])
        return np.ndarray(
            (entry['count'], columns), dtype, buffer=binary,
            offset=view.get('byteOffset', 0) + entry.get('byteOffset', 0),
            strides=(view.get('byteStride', dtype.itemsize * columns), dtype.itemsize),
        )

    return accessor(primitive['attributes']['POSITION'], 3), accessor(primitive['indices'], 1).reshape(-1, 3)


def map_atlas(partof_path, meshes_path):
    elements = {}
    for row in partof_path.read_text(encoding='utf-8').splitlines()[1:]:
        concept, _, element = row.split('\t')
        elements.setdefault(int(concept.removeprefix('FMA')), set()).add(element)
    body = json.loads((BODY / 'anchors.json').read_text(encoding='utf-8'))
    source_elements = {row['id']: set(row['source']) for row in body['parts']}
    height_offset = body['anchors']['thorax_center'][1] - 1.225
    archive = None if meshes_path.is_dir() else ZipFile(meshes_path)
    archive_paths = {Path(name).stem: name for name in archive.namelist() if name.endswith('.obj')} if archive else {}

    def coordinates(element):
        if archive:
            obj = archive.read(archive_paths[element]).decode('utf-8')
        else:
            obj = (meshes_path / f'{element}.obj').read_text(encoding='utf-8')
        points = np.array([line.split()[1:4] for line in obj.splitlines() if line.startswith('v ')], dtype=float) * .001
        return points[:, [0, 2, 1]] * [1, 1, -1] + [0, height_offset, 0]

    output = {}
    try:
        for source_name, structures in REGIONS.items():
            source = (BODY / f'{source_name}.glb').read_bytes()
            length = struct.unpack_from('<I', source, 12)[0]
            data = json.loads(source[20:20+length])
            binary = source[28+length:]
            mappings = {}
            for node_id, definitions in structures.items():
                remaining = source_elements[node_id].copy()
                members = {}
                for region, concepts in definitions.items():
                    group = remaining.intersection(set.union(*(elements[concept] for concept in concepts)))
                    if not group:
                        raise ValueError(f'Missing BodyParts3D group {node_id}/{region}')
                    members[region] = group
                    remaining.difference_update(group)
                if remaining:
                    members['base'] = remaining

                vertices, triangles = read_mesh(data, binary, node_id)
                scores = []
                for group in members.values():
                    reference = np.concatenate([coordinates(element) for element in sorted(group)])
                    distances, _ = cKDTree(reference).query(vertices)
                    scores.append(np.square(distances[triangles]).sum(axis=1))
                names = np.array(list(members), dtype='U32')
                regions = names[np.argmin(scores, axis=0)]
                if node_id == 'large_intestine':
                    x, y, _ = vertices[triangles].mean(axis=1).T
                    # This source combines the sigmoid with the descending colon.
                    regions[(regions == 'descendente') & (y < .899) & (x < .080)] = 'sigmoide'
                    # Include the blind end of the ascending surface beside the ileocecal junction.
                    regions[(regions == 'ascendente') & (y < .913)] = 'ciego'
                print(node_id, dict(zip(*np.unique(regions, return_counts=True))), flush=True)
                mappings[node_id] = [[region, sum(1 for _ in faces)] for region, faces in groupby(regions.tolist())]
            output[source_name] = {'sha256': hashlib.sha256(source).hexdigest(), 'regions': mappings}
    finally:
        if archive:
            archive.close()
    return output


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('partof', type=Path, help='BodyParts3D partof_element_parts.txt')
    parser.add_argument('meshes', type=Path, help='BodyParts3D OBJ archive or directory with extracted OBJ files')
    args = parser.parse_args()
    destination = ROOT / 'scripts/explorar-atlas-triangle-regions.json'
    mappings = map_atlas(args.partof, args.meshes)
    destination.write_text(json.dumps(mappings, separators=(',', ':')) + '\n', encoding='utf-8')
