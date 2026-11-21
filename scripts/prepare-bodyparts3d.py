"""Build the shared BodyParts3D atlas with Blender 5.2 and cwebp.

Run from the repository:
    Blender --background --factory-startup --python-exit-code 1 --python scripts/prepare-bodyparts3d.py
"""
from collections import defaultdict
from pathlib import Path
from statistics import mean
from zipfile import ZipFile
import json
import shutil
import subprocess

import bmesh
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets/_fuentes/bodyparts3d-4.0"
LEGACY = SOURCE.with_name("bodyparts3d-3.0")
OUTPUT = ROOT / "assets/anatomy/body"
SPRITES = OUTPUT / "sprites"
WORK = ROOT / "assets/_fuentes/bodyparts3d-blender"
ATTRIBUTION = "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International"
SPRITES.mkdir(parents=True, exist_ok=True)
WORK.mkdir(parents=True, exist_ok=True)


def table(name):
    concepts = defaultdict(list)
    for row in (SOURCE / f"{name}_element_parts.txt").read_text().splitlines()[1:]:
        concept, _, element = row.split("\t")
        concepts[int(concept.removeprefix("FMA"))].append(element)
    return concepts


isa, partof = table("isa"), table("partof")
archive = ZipFile(SOURCE / "isa_BP3D_4.0_obj_99.zip")
members = {Path(name).stem: name for name in archive.namelist() if name.endswith(".obj")}
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
    source = path.read_text() if path.exists() else archive.read(members[element]).decode()
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
muscle = material("Skeletal muscle | red ochre", (.34, .045, .032))
muscle_dark = material("Skeletal muscle | oxblood", (.24, .021, .019))
organs = {
    "brain": material("Brain", (.51, .29, .25)),
    "lungs": material("Lungs", (.44, .19, .22), .56),
    "heart": material("Heart", (.38, .044, .05), .52),
    "liver": material("Liver", (.26, .055, .035), .54),
    "stomach": material("Stomach", (.55, .25, .18), .54),
    "small_intestine": material("Small intestine", (.55, .29, .22), .57),
    "large_intestine": material("Large intestine", (.38, .16, .105), .55),
    "kidneys": material("Kidneys", (.30, .075, .06), .53),
}

# The DBCLS reference is in millimeters, Z up, with anterior pointing along -Y.
shin = elements([24478, 24477])
ground = min(v[2] for element in shin for v in geometry(element)[0])
offset = -ground
records = []


def make_part(term, layer, group, mat, source, budget, side=None):
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
    records.append({"id": id, "term": term, "layer": layer, "group": group, "source": source})
    return obj


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
        make_part(term, "muscles", group if group == "trunk" else f"{group}_{side}",
                  muscle if ix % 2 == 0 else muscle_dark, elements(concepts), 4800, side)

for side, id in (("left", "FMA13378"), ("right", "FMA13377")):
    if not (LEGACY / f"{id}.obj").is_file():
        raise FileNotFoundError(f"Missing BodyParts3D 3.0 mesh {id}")
    make_part("rectus_abdominis", "muscles", "abdomen", muscle, [id], 4200, side)

organ_types = [
    ("brain", "head", [50801], 17000),
    ("heart", "trunk", [7088], 12500),
    ("liver", "abdomen", [7197], 10500),
    ("stomach", "abdomen", [7148], 4000),
    ("small_intestine", "abdomen", [7200], 13000),
    ("large_intestine", "abdomen", [7201], 10000),
    ("kidneys", "abdomen", [7204, 7205], 6500),
]
# 4.0's archive contains the pulmonary trees but lacks the solid lobe surfaces.
make_part("lungs", "organs", "trunk", organs["lungs"],
          ["FMA7333", "FMA7383", "FMA7337", "FMA7370", "FMA7371"], 18500)
for term, group, concepts, budget in organ_types:
    make_part(term, "organs", group, organs[term], elements(concepts, partof), budget)


def joint(concept, top):
    vertices = [v for element in elements([concept]) for v in geometry(element)[0]]
    ordered = sorted(vertices, key=lambda vertex: vertex[2], reverse=top)
    extreme = ordered[:max(5, len(ordered)//24)]
    x, y, z = map(mean, zip(*extreme))
    return [x, z + offset, -y]


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

size_limit = 4_000_000
for layer, collection in collections.items():
    output_file = OUTPUT / f"{layer}.glb"
    bpy.ops.export_scene.gltf(filepath=str(output_file), collection=layer, export_format="GLB",
                             export_animations=False, export_texcoords=False, export_normals=True)
    assert output_file.stat().st_size < size_limit, (layer, output_file.stat().st_size)
    print(layer, len(collection.objects), output_file.stat().st_size, flush=True)

collections["reference"] = bpy.data.collections.new("Demo reference only")
scene.collection.children.link(collections["reference"])
skin = make_part("body_reference", "reference", "trunk", ivory, ["FJ2810"], 12000)
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

def render_sprite(part, destination, resolution, direction=FRONT):
    for collection in collections.values():
        for obj in collection.objects:
            obj.hide_render = (obj != part)
    coords = part.bound_box
    min_x = min(v[0] for v in coords)
    max_x = max(v[0] for v in coords)
    up = Vector((0, -direction.z, direction.y))
    projected_y = [Vector(v).dot(up) for v in coords]
    min_z, max_z = min(projected_y), max(projected_y)
    center = Vector(((min_x+max_x)/2, 0, 0)) + up * ((min_z+max_z)/2)
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    camera.location = center - 2 * direction
    for lamp, position in lights:
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
    png = WORK / f"{part.name}.png"
    scene.render.filepath = str(png)
    bpy.ops.render.render(write_still=True)
    subprocess.run([shutil.which("cwebp") or "cwebp", "-quiet", "-q", "88", "-alpha_q", "95",
                    str(png), "-o", str(destination)], check=True)
    return [center.x-width/2, -center.dot(up)-height/2, width, height]


for record in records:
    part = collections[record["layer"]].objects[record["id"]]
    direction = FOOT if record["group"].startswith("foot_") else FRONT
    record["sprite"] = render_sprite(part, SPRITES / f"{part.name}.webp", 560, direction)
    if direction == FOOT:
        record["demoSprite"] = render_sprite(part, SPRITES / f"{part.name}_front.webp", 560)
context = render_sprite(skin, OUTPUT / "body-reference.webp", 900)

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
    for field in ("sprite", "demoSprite"):
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
