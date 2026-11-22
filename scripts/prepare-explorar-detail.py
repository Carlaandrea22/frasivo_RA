"""Prepare one detailed atlas mesh in Blender. Run prepare(model, repo, output).

Source paths and part IDs come from the atlas source manifest. The exported
GLB uses one material slot per region so the next step can split the surface
without recalculating normals or adding geometry at the borders.
"""

from math import cos, pi, sin, sqrt

import bmesh
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree


COLORS = {
    'huesos': ((.73, .55, .33), .43),
    'musculos': ((.31, .047, .038), .37),
    'lungs': ((.51, .235, .197), .49),
    'stomach': ((.47, .195, .152), .42),
    'kidneys': ((.36, .081, .070), .39),
    'brain': ((.55, .325, .265), .55),
    'liver': ((.30, .059, .035), .43),
    'small_intestine': ((.48, .248, .164), .46),
    'large_intestine': ((.415, .175, .130), .49),
}
REFERENCE = {
    'huesos': 'huesos-regiones.glb',
    'musculos': 'musculos-regiones.glb',
    'organos': 'organos-regiones.glb',
}


def import_meshes(scene, path, is_obj):
    old = set(scene.objects)
    if is_obj:
        bpy.ops.wm.obj_import(filepath=path, forward_axis='Y', up_axis='Z',
                              use_split_objects=False, use_split_groups=False, global_scale=.001)
    else:
        bpy.ops.import_scene.gltf(filepath=path)
    bpy.context.view_layer.update()
    return [obj for obj in scene.objects if obj not in old and obj.type == 'MESH']


def triangle_count(obj):
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


def bounds(objects):
    points = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    low = Vector([min(point[axis] for point in points) for axis in range(3)])
    high = Vector([max(point[axis] for point in points) for axis in range(3)])
    return low, high


def surface_tree(objects):
    points, faces = [], []
    for obj in objects:
        offset = len(points)
        points.extend(obj.matrix_world @ v.co for v in obj.data.vertices)
        obj.data.calc_loop_triangles()
        faces.extend(tuple(offset + i for i in face.vertices) for face in obj.data.loop_triangles)
    return BVHTree.FromPolygons(points, faces, all_triangles=True)


def material_color(obj):
    original = obj.data.materials[0]
    if original.use_nodes:
        pbr = next(n for n in original.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        return tuple(pbr.inputs['Base Color'].default_value[:3]), pbr.inputs['Roughness'].default_value
    return tuple(original.diffuse_color[:3]), .44


def clean(obj, target, preserve_vertices):
    mesh = obj.data
    world = obj.matrix_world.copy()
    obj.parent = None
    obj.matrix_world = Matrix.Identity(4)
    mesh.transform(world)
    bpy.context.view_layer.objects.active = obj
    count = triangle_count(obj)
    if count > target:
        modifier = obj.modifiers.new('Presupuesto de triángulos', 'DECIMATE')
        modifier.ratio = target / count
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    geometry = bmesh.new()
    geometry.from_mesh(obj.data)
    if not preserve_vertices:
        bmesh.ops.remove_doubles(geometry, verts=list(geometry.verts), dist=.000002)
        bmesh.ops.dissolve_degenerate(geometry, edges=list(geometry.edges), dist=.000001)
        bmesh.ops.recalc_face_normals(geometry, faces=list(geometry.faces))
    for face in geometry.faces:
        face.smooth = True
    for edge in geometry.edges:
        if edge.is_manifold:
            edge.smooth = edge.calc_face_angle(0) < pi / 3
    geometry.to_mesh(obj.data)
    geometry.free()
    obj.data.update()
    modifier = obj.modifiers.new('Normales ponderadas', 'WEIGHTED_NORMAL')
    modifier.keep_sharp = True
    modifier.weight = 20
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def bake_ao(obj, tree, reach):
    mesh = obj.data
    for layer in list(mesh.color_attributes):
        mesh.color_attributes.remove(layer)
    for layer in list(mesh.uv_layers):
        mesh.uv_layers.remove(layer)
    ao = mesh.color_attributes.new(name='Occlusion', type='BYTE_COLOR', domain='POINT')
    mesh.color_attributes.active_color = ao
    count = 12
    rays = []
    for step in range(count):
        u = (step + .5) / count
        angle = step * pi * (3 - sqrt(5))
        rays.append((sqrt(u) * cos(angle), sqrt(u) * sin(angle), sqrt(1 - u)))
    axis_x, axis_y = Vector((1, 0, 0)), Vector((0, 1, 0))
    normals = [vertex.normal.copy() for vertex in mesh.vertices]
    values = []
    for vertex, normal in zip(mesh.vertices, normals):
        tangent = normal.cross(axis_x if abs(normal.x) < .8 else axis_y).normalized()
        bitangent = normal.cross(tangent)
        start = vertex.co + normal * .000035
        blocked = 0
        for x, y, z in rays:
            _, _, _, distance = tree.ray_cast(start, x * tangent + y * bitangent + z * normal, reach)
            if distance is not None:
                blocked += 1 - .65 * distance / reach
        value = 1 - .49 * blocked / count
        values.extend((value, value, value, 1))
    ao.data.foreach_set('color', values)


def create_material(part, color):
    rgb, roughness = color
    material = bpy.data.materials.new(f'LumAR · {part}')
    material['atlasPart'] = part
    material.use_nodes = True
    pbr = next(n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    pbr.inputs['Base Color'].default_value = (*rgb, 1)
    pbr.inputs['Roughness'].default_value = roughness
    return material


def mask_part(point, normal, masks):
    coordinates = [axis * 1000 for axis in point]
    for mask in masks:
        if 'min' in mask and any(value < limit for value, limit in zip(coordinates, mask['min'])):
            continue
        if 'max' in mask and any(value > limit for value, limit in zip(coordinates, mask['max'])):
            continue
        if 'normalMax' in mask and any(value > limit for value, limit in zip(normal, mask['normalMax'])):
            continue
        if 'ellipse' in mask:
            center, radii = mask['ellipse']
            if sum(((value - origin) / radius) ** 2 for value, origin, radius in zip(coordinates, center, radii)) > 1:
                continue
        return mask['partId']
    raise ValueError('La última máscara debe cubrir el resto de la superficie')


def prepare(model, repo, output):
    scene = bpy.data.scenes.new('LumAR | Preparación de Explorar')
    previous = bpy.context.window.scene
    bpy.context.window.scene = scene
    materials = {}
    try:
        incoming = []
        if model.get('retainedAsset'):
            for obj in import_meshes(scene, repo + '/' + model['retainedAsset']['path'], False):
                incoming.append((obj, {'partId': obj.name}, material_color(obj)))
        else:
            color = COLORS.get(model['id'], COLORS.get(model['category']))
            for source in model['sources']:
                for obj in import_meshes(scene, repo + '/' + source['path'], True):
                    incoming.append((obj, source, color))
        objects = [obj for obj, _, _ in incoming]
        if not objects:
            raise ValueError(f"{model['id']}: falta la superficie original")
        budget = model.get('maxTriangles', 60000 if model['id'] in ('skull', 'spine', 'ribs', 'hand', 'foot') else 40000)
        counts = [triangle_count(obj) for obj in objects]
        ratio = min(1, (budget - len(objects) * 2) / sum(counts))
        for (obj, source, _), count in zip(incoming, counts):
            clean(obj, max(4, int(count * ratio)), bool(model.get('retainedAsset')))
            if source.get('offsetMm'):
                offset = Vector(source['offsetMm']) * .001
                obj.data.transform(Matrix.Translation(offset))
                obj.data.update()
        low, high = bounds(objects)

        guides = {}
        ref_low, ref_scale = None, None
        registration = model.get('guideTransform')
        if registration:
            rotation = Matrix(registration['rotation']).transposed()
            translation = Vector(registration['translation']) * .001
        for guide in model.get('guides', []):
            if guide.get('partId'):
                loaded = import_meshes(scene, repo + '/' + guide['path'], True)
                guides.setdefault(guide['partId'], []).extend(loaded)
        if not guides and model['id'] != 'spine' and any(not (source.get('partId') or source.get('masks')) for _, source, _ in incoming):
            reference_path = repo + '/src/content/anatomy/modelos/' + REFERENCE[model['category']]
            reference = import_meshes(scene, reference_path, False)
            prefix = model['root'] + '__'
            for obj in reference:
                if obj.name.startswith(prefix):
                    guides.setdefault(obj.name[len(prefix):], []).append(obj)
            ref_low, ref_high = bounds([obj for group in guides.values() for obj in group])
            ref_scale = [(ref_high[axis] - ref_low[axis]) / (high[axis] - low[axis]) for axis in range(3)]
        trees = {name: surface_tree(group) for name, group in guides.items()}

        def classify(point):
            if model['id'] == 'spine':
                return 'coccix' if point.z < .824 else 'sacro'
            if registration:
                point = rotation @ point + translation
            elif ref_scale is not None:
                point = Vector([ref_low[axis] + (point[axis] - low[axis]) * ref_scale[axis] for axis in range(3)])
            distances = [(tree.find_nearest(point)[3], name) for name, tree in trees.items()]
            return min(distances)[1]

        tree = surface_tree(objects)
        reach = min(.025, max(.004, max(high - low) * .11))
        for obj, source, color in incoming:
            mesh = obj.data
            mesh.materials.clear()
            part = source.get('partId')
            masks = source.get('masks')
            offset = Vector(source.get('offsetMm', (0, 0, 0))) * .001
            if part is not None:
                regions = [part]
            elif masks:
                regions = list(dict.fromkeys(mask['partId'] for mask in masks))
            elif model['id'] == 'spine':
                regions = ['sacro', 'coccix']
            else:
                regions = list(trees)
            for region in regions:
                if region not in materials:
                    materials[region] = create_material(region, color)
                mesh.materials.append(materials[region])
            lookup = {region: index for index, region in enumerate(regions)}
            for face in mesh.polygons:
                region = part
                if region is None:
                    point = face.center - offset
                    region = mask_part(point, face.normal, masks) if masks else classify(point)
                face.material_index = lookup[region]
            bake_ao(obj, tree, reach)
        count = sum(triangle_count(obj) for obj in objects)
        if count > budget:
            raise ValueError(f"{model['id']}: {count} triángulos exceden {budget}")
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:
            obj.select_set(True)
        bpy.ops.export_scene.gltf(filepath=output, export_format='GLB', use_selection=True,
                                  use_active_scene=True, export_extras=True, export_vertex_color='ACTIVE')
        print(model['id'], sum(counts), '→', count, 'triángulos; etiquetas', sorted(materials))
    finally:
        bpy.context.window.scene = previous
        for obj in list(scene.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.scenes.remove(scene)
        for material in materials.values():
            if material.users == 0:
                bpy.data.materials.remove(material)
