"""Build the shared BodyParts3D atlas with Blender 5.2 and cwebp.

Run from the repository:
    Blender --background --factory-startup --python-exit-code 1 --python scripts/prepare-bodyparts3d.py
Append `-- --soft-tissues-only` to regenerate muscles and organs while retaining
the existing bone and reference files.
"""
from collections import defaultdict
from math import cos, pi
from pathlib import Path
from statistics import mean
from zipfile import ZipFile, is_zipfile
import json
import shutil
import subprocess
import sys

import bmesh
import bpy
from mathutils import Vector
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets/_fuentes/bodyparts3d-4.0"
LEGACY = SOURCE.with_name("bodyparts3d-3.0")
OUTPUT = ROOT / "assets/anatomy/body"
SPRITES = OUTPUT / "sprites"
REGIONS = OUTPUT.parent / "regions"
WORK = ROOT / "assets/_fuentes/bodyparts3d-blender"
ATTRIBUTION = "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International"
SPRITES.mkdir(parents=True, exist_ok=True)
REGIONS.mkdir(parents=True, exist_ok=True)
WORK.mkdir(parents=True, exist_ok=True)
soft_tissues_only = "--soft-tissues-only" in sys.argv


def table(name):
    concepts = defaultdict(list)
    for row in (SOURCE / f"{name}_element_parts.txt").read_text().splitlines()[1:]:
        concept, _, element = row.split("\t")
        concepts[int(concept.removeprefix("FMA"))].append(element)
    return concepts


isa, partof = table("isa"), table("partof")
archive = ZipFile(SOURCE / "isa_BP3D_4.0_obj_99.zip")
members = {Path(name).stem: name for name in archive.namelist() if name.endswith(".obj")}
legacy_zip = LEGACY / "BodyParts3D_3.0_obj_99.zip"
legacy_archive = ZipFile(legacy_zip) if is_zipfile(legacy_zip) else None
legacy_members = ({Path(name.replace("\\", "/")).stem: name for name in legacy_archive.namelist() if name.endswith(".obj")}
                  if legacy_archive else {})
raw = {}


def elements(concepts, prefer=isa):
    alternate = partof if prefer is isa else isa
    result = set()
    for concept in concepts:
        group = prefer.get(concept) or alternate.get(concept)
        if not group:
            raise KeyError(f"FMA{concept} is missing in the 4.0 tables")
        result.update(group)
    return sorted(result)


def geometry(element):
    if element in raw:
        return raw[element]
    vertices, faces = [], []
    path = LEGACY / (element + ".obj")
    if path.exists():
        source = path.read_text()
    elif element in members:
        source = archive.read(members[element]).decode()
    elif element in legacy_members:
        source = legacy_archive.read(legacy_members[element]).decode()
    else:
        raise KeyError(f"Missing BodyParts3D geometry {element}; see assets/anatomy/FUENTES.md")
    for line in source.splitlines():
        if line.startswith("v "):
            x, y, z = (float(value) * .001 for value in line.split()[1:4])
            # Align the older rectus meshes to the 4.0 abdominal reference.
            coords = (x, y, z - .0166) if element in {"FMA13377", "FMA13378"} else (x, y, z)
            vertices.append(coords)
        elif line.startswith("f "):
            faces.append(tuple(int(value.split("/")[0]) - 1 for value in line.split()[1:]))
    if not vertices or not faces:
        raise ValueError(f"Empty geometry: {element}")
    raw[element] = (vertices, faces)
    return raw[element]


def material(name, color, roughness=.69):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    node = next(node for node in mat.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    node.inputs["Base Color"].default_value = (*color, 1)
    node.inputs["Roughness"].default_value = roughness
    return mat


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.name = "BodyParts3D | Frasivo Explore"
scene.unit_settings.system = "METRIC"
scene["attribution"] = ATTRIBUTION
collections = {}
for layer in ("bones", "muscles", "organs"):
    collections[layer] = bpy.data.collections.new(layer)
    scene.collection.children.link(collections[layer])

ivory = material("Warm cortical ivory", (.68, .54, .36))
muscle = material("Skeletal muscle | red ochre", (.24, .022, .017))
muscle_dark = material("Skeletal muscle | oxblood", (.16, .010, .009))
tendon = material("Tendon | pearl rose", (.48, .26, .21), .58)
for mat in (muscle, muscle_dark):
    shader = next(node for node in mat.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    fibers = mat.node_tree.nodes.new("ShaderNodeVertexColor")
    fibers.layer_name = "Muscle fibers"
    mat.node_tree.links.new(fibers.outputs["Color"], shader.inputs["Base Color"])
organs = {
    "brain": material("Brain", (.51, .29, .25)),
    "lungs": material("Lungs", (.44, .19, .22), .56),
    "heart": material("Heart", (.38, .044, .05), .52),
    "liver": material("Liver", (.26, .055, .035), .54),
    "stomach": material("Stomach", (.55, .25, .18), .54),
    "small_intestine": material("Small intestine", (.55, .29, .22), .57),
    "large_intestine": material("Large intestine", (.38, .16, .105), .55),
    "kidneys": material("Kidneys", (.30, .075, .06), .53),
    "trachea": material("Trachea | cartilage", (.42, .25, .21), .58),
    "thyroid_gland": material("Thyroid | copper", (.42, .12, .085), .56),
    "urinary_bladder": material("Urinary bladder", (.43, .24, .19), .53),
}

# The DBCLS reference is in millimeters, Z up, with anterior pointing along -Y.
shin = elements([24478, 24477])
ground = min(v[2] for element in shin for v in geometry(element)[0])
offset = -ground
records = []


def make_part(term, layer, group, mat, source, budget, side=None, *, view="front", cut=None):
    id = term if side is None else f"{term}_{side}"
    vertices, faces = [], []
    for element in source:
        verts, polygons = geometry(element)
        base = len(vertices)
        vertices.extend((x, y, z + offset) for x, y, z in verts)
        faces.extend(tuple(base + index for index in polygon) for polygon in polygons)
    mesh = bpy.data.meshes.new(id)
    mesh.from_pydata(vertices, [], faces)
    mesh.validate()
    mesh.materials.append(mat)
    clean = bmesh.new()
    clean.from_mesh(mesh)
    bmesh.ops.remove_doubles(clean, verts=list(clean.verts), dist=.000012)
    bmesh.ops.dissolve_degenerate(clean, edges=list(clean.edges), dist=.000002)
    if cut:
        point, normal = cut
        result = bmesh.ops.bisect_plane(clean, geom=list(clean.verts) + list(clean.edges) + list(clean.faces),
                                       dist=.000003, plane_co=point, plane_no=normal, clear_outer=True)
        boundaries = [edge for edge in result["geom_cut"] if isinstance(edge, bmesh.types.BMEdge) and edge.is_boundary]
        bmesh.ops.holes_fill(clean, edges=boundaries)
    bmesh.ops.recalc_face_normals(clean, faces=list(clean.faces))
    for face in clean.faces:
        face.smooth = True
    clean.to_mesh(mesh)
    clean.free()
    mesh.update()

    obj = bpy.data.objects.new(id, mesh)
    collections[layer].objects.link(obj)
    obj["bodyparts3d_elements"] = ",".join(source)
    obj["term"] = term
    bpy.context.view_layer.objects.active = obj
    mesh.calc_loop_triangles()
    if len(mesh.loop_triangles) > budget:
        modifier = obj.modifiers.new("Mobile triangle budget", "DECIMATE")
        modifier.ratio = budget / len(mesh.loop_triangles)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    if term == "urinary_bladder":
        modifier = obj.modifiers.new("Smooth bladder surface", "SUBSURF")
        modifier.levels = 1
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.data.validate()
    obj.data.update()
    if mat in (muscle, muscle_dark):
        paint_fibers(obj, mat.diffuse_color)
    record = {"id": id, "term": term, "layer": layer, "group": group, "source": source}
    if layer != "bones" and view != "front":
        record["view"] = view
    records.append(record)
    return obj


def paint_fibers(obj, color):
    mesh = obj.data
    neighbors = [[] for _ in mesh.vertices]
    for edge in mesh.edges:
        a, b = edge.vertices
        neighbors[a].append(b)
        neighbors[b].append(a)
    fibers = mesh.color_attributes.new(name="Muscle fibers", type="BYTE_COLOR", domain="POINT")
    pending = set(range(len(neighbors)))
    while pending:
        seed = pending.pop()
        component = [seed]
        for index in component:
            adjacent = [other for other in neighbors[index] if other in pending]
            pending.difference_update(adjacent)
            component.extend(adjacent)
        center = sum((mesh.vertices[index].co for index in component), Vector()) / len(component)
        points = [mesh.vertices[index].co - center for index in component]
        axis = Vector((.23, .38, .89)).normalized()
        for _ in range(8):
            moments = sum((point * point.dot(axis) for point in points), Vector())
            if moments.length_squared > 1e-14:
                axis = moments.normalized()
        cross = axis.cross(Vector((0, 1, 0)))
        if cross.length_squared < .01:
            cross = axis.cross(Vector((0, 0, 1)))
        cross.normalize()
        width = [point.dot(cross) for point in points]
        span = max(width) - min(width)
        period = max(.0016, min(.008, span / 10))
        for index, point, transverse in zip(component, points, width):
            longitudinal = point.dot(axis)
            phase = 2*pi * transverse / period + .55*cos(29*longitudinal)
            tint = .95 + .17*cos(phase) + .065*cos(.37*phase)
            fibers.data[index].color = (min(1, color[0]*tint), color[1]*tint, color[2]*tint, 1)


mandible = elements([52748])
skull = sorted(set(elements([46565], partof)) - set(mandible))
make_part("skull", "bones", "head", ivory, skull, 12500)
make_part("mandible", "bones", "head", ivory, mandible, 4500)
make_part("sternum", "bones", "trunk", ivory, elements([7485], partof), 2500)
# Keep vertebrae and sacrum rather than duplicating intervening discs as bone.
vertebrae = defaultdict(list)
for row in (SOURCE / "partof_parts_list_e.txt").read_text().splitlines()[1:]:
    fma, _, label = row.split("\t")
    if (label.endswith(" vertebra") or label in {"sacrum", "coccyx"}) and not label.startswith(("anterior", "posterior")):
        vertebrae[int(fma.removeprefix("FMA"))] = label
spine = sorted(set(elements(list(vertebrae), partof)) & set(elements([13478], partof)))
make_part("spine", "bones", "abdomen", ivory, spine, 11500)

bones = [
    ("clavicle", "trunk", 13323, 13322),
    ("pelvis", "trunk", 16587, 16586),
    ("humerus", "upper_arm", 23131, 23130),
    ("radius", "forearm", 23465, 23464),
    ("ulna", "forearm", 23468, 23467),
    ("femur", "thigh", 24475, 24474),
    ("patella", "shin", 24487, 24486),
    ("tibia", "shin", 24478, 24477),
    ("fibula", "shin", 24481, 24480),
]
ribs = (
    [7987, 8005, 8039, 8148, 8093, 8202, 8256, 8310, 8391, 8472, 8532, 8534],
    [7857, 7882, 7909, 7957, 8066, 8175, 8229, 8283, 8364, 8445, 8531, 8533],
)
# Keep the hand and foot bones as separate vocabulary groups within each rigid end segment.
hands_feet = {
    "left": {
        "carpals": [24436, 24438, 24440, 24442, 24444, 24445, 24447, 24449],
        "metacarpals": list(range(24465, 24474, 2)),
        "hand_phalanges": [65470, 71915, 71908, 71916, 66791, 23938, 23940, 23942, 23944, 23951, 23953, 23955, 23957, 23959],
        "tarsals": [24483, 24498, 24501, 24522, 24524, 24526, 24529],
        "metatarsals": list(range(24508, 24517, 2)),
        "foot_phalanges": [43254, *range(32635, 32648, 2), 230988, *range(32651, 32660, 2)],
        "tips": [23953, 23959, 23951, 24498, 32651, 32653],
    },
    "right": {
        "carpals": [24435, 24437, 24439, 24441, 24443, 23725, 24446, 24448],
        "metacarpals": list(range(24464, 24473, 2)),
        "hand_phalanges": list(range(24450, 24464)),
        "tarsals": [24482, 24497, 24500, 24521, 24523, 24525, 24528],
        "metatarsals": list(range(24507, 24516, 2)),
        "foot_phalanges": [43253, *range(32634, 32647, 2), 230986, *range(32650, 32659, 2)],
        "tips": [24460, 24463, 24459, 24497, 32650, 32652],
    },
}
for number, side in enumerate(("left", "right")):
    make_part("ribs", "bones", "trunk", ivory, elements(ribs[number], partof), 10000, side)
    for term, group, left, right in bones:
        make_part(term, "bones", "pelvis" if term == "pelvis" else group if group == "trunk" else f"{group}_{side}",
                  ivory, elements([left if number == 0 else right]), 3700, side)

    for term in ("carpals", "metacarpals", "hand_phalanges", "tarsals", "metatarsals", "foot_phalanges"):
        segment = "hand" if term in ("carpals", "metacarpals", "hand_phalanges") else "foot"
        make_part(term, "bones", f"{segment}_{side}", ivory, elements(hands_feet[side][term]), 3500, side)

muscles = [
    ("pectoralis_major", "trunk", [34691, 79980, 45875], [34690, 79979, 45874]),
    ("deltoid", "upper_arm", [34681, 34683, 34685], [34680, 34682, 34684]),
    ("biceps_brachii", "upper_arm", [37685, 37687], [37684, 37686]),
    ("triceps_brachii", "upper_arm", [37696, 37698, 37700], [37695, 37697, 37699]),
    ("external_oblique", "abdomen", [13337], [13336]),
    ("quadriceps_femoris", "thigh", [38929, 38931, 38933, 38935], [38928, 38930, 38932, 38934]),
    ("sartorius", "thigh", [22355], [22354]),
    ("gastrocnemius", "shin", [45958, 45961], [45957, 45960]),
    ("tibialis_anterior", "shin", [22545], [22544]),
]
for ix, (term, group, left, right) in enumerate(muscles):
    for side, concepts in (("left", left), ("right", right)):
        segment = group if group in {"trunk", "abdomen"} else f"{group}_{side}"
        make_part(term, "muscles", segment, muscle if ix % 2 == 0 else muscle_dark,
                  elements(concepts), 3250, side, view="both" if term in {"triceps_brachii", "gastrocnemius"} else "front")

for side, id in (("left", "FMA13378"), ("right", "FMA13377")):
    make_part("rectus_abdominis", "muscles", "abdomen", muscle, [id], 3600, side)


def joint(concept, top):
    vertices = [v for element in elements([concept]) for v in geometry(element)[0]]
    ordered = sorted(vertices, key=lambda vertex: vertex[2], reverse=top)
    extreme = ordered[:max(5, len(ordered)//24)]
    x, y, z = map(mean, zip(*extreme))
    return [x, z + offset, -y]


body_detail = [
    ("serratus_anterior", "trunk", [13399], [13398], "front", 2700),
    ("trapezius", "trunk", [33583, 33585, 33587], [33581, 33584, 33586], "both", 3300),
    ("brachioradialis", "forearm", [38487], [38486], "front", 2400),
    ("adductors", "thigh", [22454, 22457, 22460], [22452, 22456, 22459], "front", 3300),
    ("gluteus_maximus", "pelvis", [22329], [22328], "back", 3100),
    ("hamstrings", "thigh", [22359, 22449, 45889], [22358, 22448, 45888], "back", 3500),
    ("sternocleidomastoid", "head", [13409], [13408], "front", 2100),
    ("thenar_eminence", "hand", [37387, 65199, 37391], [37386, 65198, 37390], "front", 1900),
    ("hypothenar_eminence", "hand", [37397, 37399, 37401], [37396, 37398, 37400], "front", 1600),
    ("dorsal_interossei", "hand", [42405], [42404], "front", 1900),
]
for ix, (term, group, left, right, view, budget) in enumerate(body_detail):
    for side, concepts in (("left", left), ("right", right)):
        segment = f"{group}_{side}" if group in {"forearm", "thigh", "hand"} else group
        # The right atlas element also includes a duplicate on the left of the midline.
        cut = ((0, 0, 0), (1, 0, 0)) if term == "sternocleidomastoid" and side == "right" else None
        make_part(term, "muscles", segment, muscle if ix % 2 == 0 else muscle_dark,
                  elements(concepts), budget, side, view=view, cut=cut)

hand_paths = {
    "flexor": {
        "left": ([38471, 38480, 38484], [38461, 38464, 38618, 38620]),
        "right": ([38470, 38479, 38482], [38460, 38463, 38617, 38619]),
    },
    "extensor": {
        "left": ([38502, 38505, 38520, 38523, 38526], [38496, 38499, 38508]),
        "right": ([38501, 38504, 38519, 38522, 38525], [38495, 38498, 38507]),
    },
}
for side, radius in (("left", 23465), ("right", 23464)):
    wrist = joint(radius, False)[1]
    for action, definitions in hand_paths.items():
        finger_muscles, wrist_muscles = definitions[side]
        make_part(f"{action}_tendons", "muscles", f"hand_{side}", tendon, elements(finger_muscles),
                  2000, side, cut=((0, 0, wrist), (0, 0, 1)))
        make_part(f"forearm_{action}s", "muscles", f"forearm_{side}", muscle_dark,
                  elements(finger_muscles + wrist_muscles), 3500, side,
                  view="both" if action == "extensor" else "front", cut=((0, 0, wrist), (0, 0, -1)))

for side, name in (("left", "FMA13359"), ("right", "FMA13358")):
    make_part("latissimus_dorsi", "muscles", "trunk", muscle, [name], 4100, side, view="back")

facial_muscles = [
    ("frontalis", [46759, 46760], 2900),
    ("orbicularis_oculi", [46782, 46783, 46785, 46786], 3200),
    ("orbicularis_oris", [46841], 2400),
    ("zygomaticus_major", [46812, 46813], 2100),
    ("masseter", [49001, 49002, 49004, 49005], 3100),
    ("temporalis", [49007, 49008], 3300),
    ("buccinator", [46835, 46836], 2000),
]
for ix, (term, concepts, budget) in enumerate(facial_muscles):
    make_part(term, "muscles", "head", muscle if ix % 2 == 0 else muscle_dark,
              [f"FMA{concept}" for concept in concepts], budget)

organ_types = [
    ("brain", "head", [50801], 17000),
    ("heart", "trunk", [7088], 12500),
    ("liver", "abdomen", [7197], 10500),
    ("stomach", "abdomen", [7148], 4000),
    ("small_intestine", "abdomen", [7200], 13000),
    ("large_intestine", "abdomen", [7201], 10000),
    ("kidneys", "abdomen", [7204, 7205], 6500),
    ("trachea", "head", [7394], 4200),
    ("urinary_bladder", "abdomen", [15900], 2100),
]
# 4.0's archive contains the pulmonary trees but lacks the solid lobe surfaces.
make_part("lungs", "organs", "trunk", organs["lungs"],
          ["FMA7333", "FMA7383", "FMA7337", "FMA7370", "FMA7371"], 18500)
for term, group, concepts, budget in organ_types:
    make_part(term, "organs", group, organs[term], elements(concepts, partof), budget,
              view="back" if term == "kidneys" else "front")


def thyroid_geometry():
    # The two lobes and isthmus wrap the atlas trachea. This is a schematic
    # because neither BodyParts3D archive contains a thyroid gland surface.
    shapes = bpy.data.metaballs.new("Thyroid reference")
    # Blender clamps the metaball grid to a minimum spacing. Model in
    # decimeters and return meters to retain the curvature of the lobes.
    shapes.resolution = .007
    shapes.threshold = .63
    obj = bpy.data.objects.new("Thyroid reference", shapes)
    scene.collection.objects.link(obj)
    for center, dimensions in (
        ((-.015, -.107, 1.358), (.014, .013, .034)),
        ((.016, -.105, 1.359), (.014, .013, .036)),
        ((0, -.113, 1.350), (.026, .0065, .010)),
    ):
        lobe = shapes.elements.new(type="ELLIPSOID")
        lobe.co = Vector(center) * 10
        lobe.radius = 1
        lobe.size_x, lobe.size_y, lobe.size_z = (dimension * 10 for dimension in dimensions)
        lobe.stiffness = 2
    bpy.context.view_layer.update()
    resolved = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = resolved.to_mesh()
    vertices = [tuple(vertex.co / 10) for vertex in mesh.vertices]
    faces = [tuple(face.vertices) for face in mesh.polygons]
    resolved.to_mesh_clear()
    bpy.data.objects.remove(obj, do_unlink=True)
    if not vertices or not faces:
        raise ValueError("Empty thyroid reference surface")
    return vertices, faces


thyroid_source = "LumAR-thyroid-reference-FMA7394"
raw[thyroid_source] = thyroid_geometry()
make_part("thyroid_gland", "organs", "head", organs["thyroid_gland"], [thyroid_source], 2700)


anchors = {}
for side, definitions in {
    "left": {"shoulder": (23131, True), "elbow": (23131, False), "wrist": (23465, False),
             "hip": (24475, True), "knee": (24475, False), "ankle": (24478, False)},
    "right": {"shoulder": (23130, True), "elbow": (23130, False), "wrist": (23464, False),
              "hip": (24474, True), "knee": (24474, False), "ankle": (24477, False)},
}.items():
    for name, (concept, upper) in definitions.items():
        anchors[f"{name}_{side}"] = joint(concept, upper)

anchors["ear_left"] = [.073, 1.515 + offset, .119]
anchors["ear_right"] = [-.073, 1.515 + offset, .119]
anchors["eye_left"] = [.034, 1.545 + offset, .165]
anchors["eye_right"] = [-.034, 1.545 + offset, .165]

FRONT = Vector((0, 1, 0))
BACK = Vector((0, -1, 0))
FOOT = Vector((0, 1, -.86)).normalized()

def center(concept):
    vertices = [v for element in elements([concept]) for v in geometry(element)[0]]
    x, y, z = map(mean, zip(*vertices))
    return Vector((x, y, z + offset))

def from_atlas(point):
    x, y, z = point
    return Vector((x, -z, y))

sprite_anchors = {}
for side, definition in hands_feet.items():
    index, pinky, thumb, heel, big_toe, second_toe = map(center, definition["tips"])
    toe = (big_toe + second_toe) / 2
    for label, point in (("index", index), ("pinky", pinky), ("thumb", thumb), ("heel", heel), ("toe", toe)):
        anchors[f"{label}_{side}"] = [point.x, point.z, -point.y]
    # Keep 3D positions intact and store separate projections for the oblique view.
    up = Vector((0, -FOOT.z, FOOT.y))
    for label, point in (("ankle", from_atlas(anchors[f"ankle_{side}"])), ("heel", heel), ("toe", toe)):
        sprite_anchors[f"{label}_{side}"] = [point.x, -point.dot(up)]

anchors["thorax_center"] = [0, 1.225 + offset, .12]

def export_model(collection, output_file):
    bpy.ops.export_scene.gltf(filepath=str(output_file), collection=collection.name, export_format="GLB",
                             export_animations=False, export_texcoords=False, export_normals=True,
                             export_extras=True)
    assert output_file.stat().st_size <= 4_000_000, (output_file, output_file.stat().st_size)
    print(output_file.name, len(collection.objects), output_file.stat().st_size, flush=True)


def export_region(name, layer, objects):
    collection = bpy.data.collections.new(name)
    scene.collection.children.link(collection)
    nodes = [(node, collections[layer].objects[node]) for node in objects]
    try:
        for node, obj in nodes:
            collection.objects.link(obj)
            if name == "hand-muscles":
                obj.name = node.removesuffix("_right")
        export_model(collection, REGIONS / f"{name}.glb")
    finally:
        for node, obj in nodes:
            obj.name = node
        bpy.data.collections.remove(collection)


for layer, collection in collections.items():
    if layer != "bones" or not soft_tissues_only:
        export_model(collection, OUTPUT / f"{layer}.glb")

export_region("hand-muscles", "muscles", [f"{term}_right" for term in (
    "thenar_eminence", "hypothenar_eminence", "dorsal_interossei", "flexor_tendons", "extensor_tendons",
)])
export_region("head-muscles", "muscles", [
    *(term for term, _, _ in facial_muscles), "sternocleidomastoid_left", "sternocleidomastoid_right",
])
export_region("head-organs", "organs", ["brain", "trachea", "thyroid_gland"])

collections["reference"] = bpy.data.collections.new("Demo reference only")
scene.collection.children.link(collections["reference"])
skin = make_part("body_reference", "reference", "trunk", ivory, ["FJ2810"], 12000)
records.pop()
front_trapezius = {}
for side, concept in (("left", 33587), ("right", 33586)):
    key = f"trapezius_{side}"
    original = collections["muscles"].objects[key]
    front_trapezius[key] = make_part(f"{key}_superior", "reference", "trunk", original.data.materials[0],
                                     elements([concept]), 1800)
    records.pop()
outline = skin.bound_box
left, right = min(v[0] for v in outline), max(v[0] for v in outline)
top, bottom = max(v[2] for v in outline), min(v[2] for v in outline)
bounds = [left, -top, right-left, top-bottom]

scene.render.engine = "CYCLES"
scene.cycles.samples = 12
scene.cycles.use_denoising = True
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.world = bpy.data.worlds.new("Soft studio")
scene.world.use_nodes = True
scene.world.node_tree.nodes.get("Background").inputs["Strength"].default_value = .36
scene.view_settings.view_transform = "AgX"
camera_data = bpy.data.cameras.new("Front orthographic")
camera_data.type = "ORTHO"
camera = bpy.data.objects.new("Front orthographic", camera_data)
scene.collection.objects.link(camera)
camera.rotation_euler = Vector((0, 1, 0)).to_track_quat("-Z", "Y").to_euler()
scene.camera = camera
lights = []
for name, position, energy, size in (
    ("Key", (-.35,-.57,.48), 24, .55),
    ("Fill", (.45,-.35,.13), 8, .48),
    ("Rim", (.26,.20,.5), 17, .42),
):
    light = bpy.data.lights.new(name, "AREA")
    light.energy = energy
    light.shape = "DISK"
    light.size = size
    obj = bpy.data.objects.new(name, light)
    scene.collection.objects.link(obj)
    lights.append((obj, Vector(position)))

def sprite_pixel_anchor(png, mirror):
    image = bpy.data.images.load(str(png), check_existing=False)
    width, height = image.size
    pixels = np.empty((height, width, 4), dtype=np.float32)
    image.pixels.foreach_get(pixels.ravel())
    if mirror:
        pixels = np.ascontiguousarray(pixels[:, ::-1, :])
        image.pixels.foreach_set(pixels.ravel())
        image.save()
    opaque = np.argwhere(pixels[:, :, 3] >= .75)
    y, x = opaque[np.argmin(np.sum((opaque-opaque.mean(axis=0))**2, axis=1))]
    bpy.data.images.remove(image)
    return [float((x + .5) / width), float(1 - (y + .5) / height)]


def render_sprite(part, destination, resolution, direction=FRONT, *, label=False):
    for collection in collections.values():
        for obj in collection.objects:
            obj.hide_render = (obj != part)
    coords = part.bound_box
    min_x = min(v[0] for v in coords)
    max_x = max(v[0] for v in coords)
    posterior = direction == BACK
    up = Vector((0, 0, 1)) if posterior else Vector((0, -direction.z, direction.y))
    projected_y = [Vector(v).dot(up) for v in coords]
    min_z, max_z = min(projected_y), max(projected_y)
    center = Vector(((min_x+max_x)/2, 0, 0)) + up * ((min_z+max_z)/2)
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    camera.location = center - 2 * direction
    for lamp, position in lights:
        if posterior:
            position = Vector((-position.x, -position.y, position.z))
        lamp.location = center + position
        lamp.rotation_euler = (-position).to_track_quat("-Z", "Y").to_euler()
    size_x, size_y = max_x-min_x, max_z-min_z
    scale = resolution / max(size_x, size_y)
    scene.render.resolution_x = max(60, round(size_x*scale)+12)
    scene.render.resolution_y = max(60, round(size_y*scale)+12)
    scene.render.resolution_percentage = 100
    camera_data.ortho_scale = 1
    frame = camera_data.view_frame(scene=scene)
    width = max(v.x for v in frame) - min(v.x for v in frame)
    height = max(v.y for v in frame) - min(v.y for v in frame)
    camera_data.ortho_scale = max(size_x/width, size_y/height) * 1.045
    width *= camera_data.ortho_scale
    height *= camera_data.ortho_scale
    png = WORK / destination.with_suffix(".png").name
    scene.render.filepath = str(png)
    bpy.ops.render.render(write_still=True)
    label_point = sprite_pixel_anchor(png, posterior) if label else None
    subprocess.run([shutil.which("cwebp") or "cwebp", "-quiet", "-q", "88", "-alpha_q", "95",
                    str(png), "-o", str(destination)], check=True)
    return [center.x-width/2, -center.dot(up)-height/2, width, height], label_point


existing_atlas = json.loads((OUTPUT / "anchors.json").read_text()) if soft_tissues_only else None
if existing_atlas:
    records[:] = [row for row in records if row["layer"] != "bones"]
for record in records:
    part_id = record["id"]
    part = collections[record["layer"]].objects[part_id]
    view = record.get("view", "front")
    direction = FOOT if record["group"].startswith("foot_") else BACK if view == "back" else FRONT
    anterior = front_trapezius.get(part_id) if direction == FRONT else None
    record["sprite"], label_point = render_sprite(anterior or part, SPRITES / f"{part_id}.webp", 560, direction,
                                                   label=record["layer"] != "bones")
    if label_point:
        record["labelPoint"] = label_point
    if view == "both":
        record["backSprite"], record["backLabelPoint"] = render_sprite(
            part, SPRITES / f"{part.name}_back.webp", 560, BACK, label=True,
        )
    if direction == FOOT:
        record["demoSprite"], _ = render_sprite(part, SPRITES / f"{part.name}_front.webp", 560)
if existing_atlas:
    records[:0] = [row for row in existing_atlas["parts"] if row["layer"] == "bones"]
    context = existing_atlas["reference"]
else:
    context, _ = render_sprite(skin, OUTPUT / "body-reference.webp", 900)

for collection in collections.values():
    for part in collection.objects:
        part.hide_render = False
collections["muscles"].hide_render = True
collections["organs"].hide_render = True
collections["reference"].hide_render = True
bpy.ops.wm.save_as_mainfile(filepath=str(WORK / "bodyparts3d-atlas.blend"))

def rounded(values):
    return [round(value, 6) for value in values]

for row in records:
    for field in ("sprite", "demoSprite", "backSprite", "labelPoint", "backLabelPoint"):
        if field in row:
            row[field] = rounded(row[field])

(OUTPUT / "anchors.json").write_text(json.dumps({
    "units": "m",
    "axes": "GLB: +X anatomical left, +Y superior, +Z anterior. Sprite bounds: x, negative y, width, height.",
    "attribution": ATTRIBUTION,
    "bounds": rounded(bounds),
    "reference": rounded(context),
    "anchors": {key: rounded(value) for key, value in anchors.items()},
    "spriteAnchors": {key: rounded(value) for key, value in sprite_anchors.items()},
    "parts": records,
}, ensure_ascii=False, indent=2) + "\n")
print("Atlas listo", len(records), "nodos", flush=True)
