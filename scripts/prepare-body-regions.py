"""Export the BodyParts3D regional bone meshes and rig landmarks.

Run from the repository through Blender:
    Blender --background --factory-startup --python-exit-code 1 --python scripts/prepare-body-regions.py
"""
from collections import defaultdict
import json
from pathlib import Path
from zipfile import ZipFile

import bmesh
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/_fuentes/bodyparts3d-4.0"
OUTPUT = ROOT / "assets/anatomy/regions"
BODY = json.loads((ROOT / "assets/anatomy/body/anchors.json").read_text())["anchors"]
ATTRIBUTION = "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International"
OUTPUT.mkdir(parents=True, exist_ok=True)


def concepts(table_name):
    table = defaultdict(set)
    path = SOURCE / f"{table_name}_element_parts.txt"
    for row in path.read_text().splitlines()[1:]:
        concept, _, element = row.split("\t")
        table[int(concept.removeprefix("FMA"))].add(element)
    return table


isa, partof = concepts("isa"), concepts("partof")
archive = ZipFile(SOURCE / "isa_BP3D_4.0_obj_99.zip")
members = {Path(name).stem: name for name in archive.namelist() if name.endswith(".obj")}
geometry_cache = {}


def elements(ids, *, compound=False):
    primary, alternate = (partof, isa) if compound else (isa, partof)
    result = set()
    for concept in ids:
        matches = primary.get(concept) or alternate.get(concept)
        if not matches:
            raise ValueError(f"BodyParts3D has no elements for FMA{concept}")
        result.update(matches)
    return result


def geometry(element):
    if element not in geometry_cache:
        vertices, faces = [], []
        for line in archive.read(members[element]).decode().splitlines():
            if line.startswith("v "):
                vertices.append(tuple(float(value) * .001 for value in line.split()[1:4]))
            elif line.startswith("f "):
                faces.append(tuple(int(value.split("/")[0]) - 1 for value in line.split()[1:]))
        if not vertices or not faces:
            raise ValueError(f"Empty geometry: {element}")
        geometry_cache[element] = vertices, faces
    return geometry_cache[element]


# Share the vertical reference of bones.glb. Blender Z up becomes glTF Y up.
offset = -min(v[2] for element in elements([24477, 24478]) for v in geometry(element)[0])
sources = {}
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene["attribution"] = ATTRIBUTION
ivory = bpy.data.materials.new("Warm cortical ivory")
ivory.diffuse_color = (.68, .54, .36, 1)
ivory.use_nodes = True
principled = next(node for node in ivory.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
principled.inputs["Base Color"].default_value = ivory.diffuse_color
principled.inputs["Roughness"].default_value = .69


def asset_point(vertex):
    x, y, z = vertex
    return Vector((x, z + offset, -y))


def make_bone(name, identifiers, budget):
    vertices, polygons = [], []
    for element in sorted(identifiers):
        source_vertices, source_faces = geometry(element)
        base = len(vertices)
        vertices.extend((x, y, z + offset) for x, y, z in source_vertices)
        polygons.extend(tuple(base + index for index in face) for face in source_faces)

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], polygons)
    mesh.validate()
    mesh.materials.append(ivory)
    clean = bmesh.new()
    clean.from_mesh(mesh)
    bmesh.ops.remove_doubles(clean, verts=list(clean.verts), dist=.000008)
    bmesh.ops.dissolve_degenerate(clean, edges=list(clean.edges), dist=.000002)
    bmesh.ops.triangulate(clean, faces=list(clean.faces))
    bmesh.ops.recalc_face_normals(clean, faces=list(clean.faces))
    for face in clean.faces:
        face.smooth = True
    clean.to_mesh(mesh)
    clean.free()
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    obj["bodyparts3d_elements"] = ",".join(sorted(identifiers))
    obj["atlas_region_bone"] = name
    sources[name] = sorted(identifiers)
    bpy.context.view_layer.objects.active = obj
    mesh.calc_loop_triangles()
    if len(mesh.loop_triangles) > budget:
        modifier = obj.modifiers.new("Mobile triangle budget", "DECIMATE")
        modifier.ratio = budget / len(mesh.loop_triangles)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.data.validate()
    obj.data.update()
    return [asset_point(v) for element in identifiers for v in geometry(element)[0]]


def export_region(name):
    scene.name = f"LumAR | {name}"
    bpy.ops.export_scene.gltf(filepath=str(OUTPUT / f"{name}.glb"), export_format="GLB",
                              export_extras=True, export_animations=False,
                              export_cameras=False, export_lights=False)
    for obj in list(scene.objects):
        bpy.data.objects.remove(obj, do_unlink=True)


def mean(vertices):
    return sum(vertices, Vector()) / len(vertices)


def bone_endpoints(vertices):
    # Find the shaft's principal line, then average the end surfaces rather
    # than using individual extreme vertices as the anatomical joint centers.
    center = mean(vertices)
    delta = [v - center for v in vertices]
    distal = Vector((0, -1, .35))
    axis = distal.normalized()
    for _ in range(16):
        axis = sum((v * v.dot(axis) for v in delta), Vector()).normalized()
    if axis.dot(distal) < 0:
        axis.negate()
    projected = [v.dot(axis) for v in delta]
    lo, hi = min(projected), max(projected)
    trim = (hi - lo) * .12
    return (mean([v for v, p in zip(vertices, projected) if p <= lo + trim]),
            mean([v for v, p in zip(vertices, projected) if p >= hi - trim]))


def triplet(point):
    return [round(coordinate, 6) for coordinate in point]


def build_hand():
    make_bone("carpals", elements([24435, 24437, 24439, 24441, 24443, 23725, 24446, 24448]), 2100)
    digits = {
        "thumb": (24464, (24450, 24459), 1),
        "index": (24466, (24451, 24455, 24460), 5),
        "middle": (24468, (24452, 24456, 24461), 9),
        "ring": (24470, (24453, 24457, 24462), 13),
        "little": (24472, (24454, 24458, 24463), 17),
    }
    bones = {}
    palm = {"wrist": BODY["wrist_right"]}
    for digit, (metacarpal, phalanges, first) in digits.items():
        name = f"metacarpal_{digit}"
        start, end = bone_endpoints(make_bone(name, elements([metacarpal]), 580))
        bones[name] = {
            "indices": [1, 2] if digit == "thumb" else [0, first],
            "start": triplet(start), "end": triplet(end),
        }
        labels = ("proximal", "distal") if digit == "thumb" else ("proximal", "middle", "distal")
        base = first + 1 if digit == "thumb" else first
        for i, (label, concept) in enumerate(zip(labels, phalanges)):
            name = f"phalanx_{digit}_{label}"
            start, end = bone_endpoints(make_bone(name, elements([concept]), 430))
            bones[name] = {"indices": [base+i, base+i+1], "start": triplet(start), "end": triplet(end)}
            if i == 0 and digit in ("index", "little"):
                palm["index" if digit == "index" else "pinky"] = triplet(start)
    export_region("hand")
    return {"palm": palm, "bones": bones}


def build_head():
    face_groups = {
        "frontal": ([52734], 1800),
        "parietal": ([52788, 52789], 1800),
        "temporal": ([52738, 52739], 2000),
        "maxilla": ([53649, 53650], 1600),
        "zygomatic": ([52892, 52893], 950),
        "nasal": ([53647, 53648], 450),
    }
    jaw_elements = elements([52748])
    skull = elements([46565], compound=True) - jaw_elements
    for name, (ids, budget) in face_groups.items():
        group = elements(ids)
        make_bone(name, group, budget)
        skull -= group
    make_bone("skull", skull, 5900)
    jaw = make_bone("mandible", jaw_elements, 3400)
    cervical = make_bone("cervical", elements(range(12519, 12526), compound=True), 4000)

    jaw_min_y, jaw_max_y = min(v.y for v in jaw), max(v.y for v in jaw)
    chin = mean([v for v in jaw if abs(v.x) < .025 and v.y <= jaw_min_y + .007])
    condyles = [v for v in jaw if abs(v.x) > .038 and v.y >= jaw_max_y - .012]
    yaw_hinge = mean(condyles)
    yaw_hinge.x = 0
    neck_top = max(v.y for v in cervical)
    neck_joint = mean([v for v in cervical if v.y >= neck_top - .009])
    eye_mid = mean([Vector(BODY["eye_left"]), Vector(BODY["eye_right"])])
    nose = eye_mid + Vector((0, -.018, .031))
    export_region("head")
    return {
        "eyeLeft": BODY["eye_left"], "eyeRight": BODY["eye_right"],
        "nose": triplet(nose), "chin": triplet(chin),
        "jawPivot": triplet(yaw_hinge), "neckJoint": triplet(neck_joint),
    }


def build_foot():
    make_bone("calcaneus", elements([24497]), 950)
    make_bone("talus", elements([24482]), 950)
    make_bone("tarsals", elements([24500, 24521, 24523, 24525, 24528]), 2100)
    for index, concept in enumerate(range(24507, 24516, 2), start=1):
        make_bone(f"metatarsal_{index}", elements([concept]), 575)
    make_bone("foot_phalanges", elements([43253, *range(32634, 32647, 2), 230986, *range(32650, 32659, 2)]), 1900)
    export_region("foot")
    return {label: BODY[f"{label}_right"] for label in ("ankle", "heel", "toe")}


metadata = {
    "units": "m",
    "axes": "+Y superior, +Z anterior, +X toward the subject's left",
    "attribution": ATTRIBUTION,
    "hand": build_hand(),
    "head": build_head(),
    "foot": build_foot(),
    "sources": sources,
}
(OUTPUT / "anchors.json").write_text(json.dumps(metadata, indent=2) + "\n")
