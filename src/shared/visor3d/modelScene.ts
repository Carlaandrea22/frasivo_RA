import {
  Box3, InstancedMesh, Line, Mesh, Points, Raycaster, SkinnedMesh, Texture, Vector2, Vector3,
  type BufferGeometry, type Camera, type Intersection, type Material, type Object3D,
} from 'three';

export interface Viewer3DAnchor {
  id: string;
  nodeId?: string;
  /** Coordinates local to the named node, or to the GLB scene if omitted. */
  point: readonly [number, number, number];
}

export interface Viewer3DProjectedAnchor {
  id: string;
  /** Coordinates in CSS pixels relative to the canvas. */
  x: number;
  y: number;
  visible: boolean;
}

type Renderable = Mesh | Line | Points;

export interface ModelScene {
  root: Object3D;
  nodes: Map<string, Object3D>;
  visible: Set<Object3D>;
  objects: Renderable[];
  bounds: Box3;
  selectionId: (object: Object3D) => string | null;
}

function isRenderable(object: Object3D): object is Renderable {
  return object instanceof Mesh || object instanceof Line || object instanceof Points;
}

export function belongsTo(object: Object3D, ancestor: Object3D) {
  for (let node: Object3D | null = object; node; node = node.parent) {
    if (node === ancestor) return true;
  }
  return false;
}

export function createModelScene(root: Object3D, nodeId?: string): ModelScene | undefined {
  const nodes = new Map<string, Object3D>();
  const readIds = [
    (node: Object3D) => node.userData.nodeId,
    (node: Object3D) => node.userData.name,
    (node: Object3D) => node.name,
  ];
  for (const readId of readIds) {
    root.traverse(node => {
      const id: unknown = readId(node);
      if (typeof id === 'string' && id && !nodes.has(id)) nodes.set(id, node);
    });
  }
  const isolated = nodeId === undefined ? root : nodes.get(nodeId);
  if (!isolated) return;

  const visible = new Set<Object3D>();
  const objects: Renderable[] = [];
  root.traverseVisible(node => {
    if (!belongsTo(node, isolated)) return;
    visible.add(node);
    if (isRenderable(node)) objects.push(node);
  });

  // Layers keep ancestor transforms and skinning intact even when a parent has its own geometry.
  if (isolated !== root) {
    root.traverse(node => { if (!visible.has(node)) node.layers.disable(0); });
  }

  root.updateMatrixWorld(true);
  const bounds = new Box3();
  const box = new Box3();
  for (const object of objects) {
    const local = object instanceof InstancedMesh || object instanceof SkinnedMesh ? object : object.geometry;
    if (!local.boundingBox) local.computeBoundingBox();
    if (local.boundingBox) bounds.union(box.copy(local.boundingBox).applyMatrix4(object.matrixWorld));
  }
  if (bounds.isEmpty()) return;

  function selectionId(object: Object3D) {
    let fallback: string | null = null;
    for (let node: Object3D | null = object; node && node !== root; node = node.parent) {
      const { nodeId, name } = node.userData;
      if (typeof nodeId === 'string' && nodes.get(nodeId) === node) return nodeId;
      if (typeof name === 'string' && nodes.get(name) === node) return name;
      if (!fallback && nodes.get(node.name) === node) fallback = node.name;
    }
    return fallback;
  }

  return { root, nodes, visible, objects, bounds, selectionId };
}

export function projectAnchors(
  model: ModelScene, camera: Camera, anchors: readonly Viewer3DAnchor[], width: number, height: number,
): Viewer3DProjectedAnchor[] {
  const visible = new Set<Object3D>();
  const occluders: Mesh[] = [];
  model.root.traverseVisible(node => {
    if (!model.visible.has(node)) return;
    visible.add(node);
    if (node instanceof Mesh && node.layers.test(camera.layers)) occluders.push(node);
  });
  const world = new Vector3(), point = new Vector3(), ndc = new Vector2();
  const tolerance = model.bounds.getSize(point).length() * .005; // 1% of the bounding sphere radius.
  const ray = new Raycaster();
  ray.layers.mask = camera.layers.mask;
  const intersections: Intersection<Mesh>[] = [];
  return anchors.map(({ id, nodeId, point: local }) => {
    const node = nodeId === undefined ? model.root : model.nodes.get(nodeId);
    if (!node || !visible.size || (nodeId !== undefined && !visible.has(node))) return { id, x: 0, y: 0, visible: false };
    world.set(...local).applyMatrix4(node.matrixWorld);
    point.copy(world).project(camera);
    if (![point.x, point.y, point.z].every(Number.isFinite)) return { id, x: 0, y: 0, visible: false };
    const inFrame = Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1 && Math.abs(point.z) <= 1;
    let blocked = false;
    if (inFrame) {
      ray.setFromCamera(ndc.set(point.x, point.y), camera);
      ray.far = world.distanceTo(ray.ray.origin) - tolerance;
      intersections.length = 0;
      ray.intersectObjects(occluders, false, intersections);
      blocked = intersections.some(({ object, face }) => {
        const material = Array.isArray(object.material) ? object.material[face?.materialIndex ?? 0] : object.material;
        return material?.visible;
      });
    }
    return {
      id,
      x: (point.x + 1) * width / 2,
      y: (1 - point.y) * height / 2,
      visible: inFrame && !blocked && (!(node instanceof Mesh) || node.layers.test(camera.layers)),
    };
  });
}

export function disposeModels(roots: readonly Object3D[]) {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  for (const root of roots) root.traverse(node => {
    if (!isRenderable(node)) return;
    if (node instanceof SkinnedMesh) node.skeleton.dispose();
    if (node instanceof InstancedMesh) node.dispose();
    geometries.add(node.geometry);
    for (const material of [node.material].flat()) materials.add(material);
  });
  for (const material of materials) {
    for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
    material.dispose();
  }
  for (const texture of textures) texture.dispose();
  for (const geometry of geometries) geometry.dispose();
}
