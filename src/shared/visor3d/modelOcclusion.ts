import {
  Float16BufferAttribute, Matrix3, Matrix4, Mesh, Ray,
  type BufferGeometry, type Intersection, type Object3D, type Raycaster,
} from 'three';
import { MeshBVH } from 'three-mesh-bvh';

function buildTree(geometry: BufferGeometry) {
  const position = geometry.getAttribute('position');
  const count = geometry.index?.count ?? position?.count ?? 0;
  if (position?.itemSize !== 3 || position instanceof Float16BufferAttribute || count < 3 || count % 3) return;
  try {
    // Indirect mode preserves the index and triangle order used by rendering and native picking.
    return new MeshBVH(geometry, { indirect: true, setBoundingBox: false });
  } catch {
    // Unsupported geometry still uses Three's raycast.
  }
}

export function createModelOcclusion(objects: readonly Object3D[]) {
  const trees = new Map<Mesh, MeshBVH>();
  const byGeometry = new Map<BufferGeometry, MeshBVH | undefined>();
  for (const object of objects) {
    // Native raycasting handles skinning, instances, morph targets and material groups.
    if (!(object instanceof Mesh) || object.constructor !== Mesh || object.morphTargetInfluences
      || Array.isArray(object.material)) continue;
    const { geometry } = object;
    if (geometry.groups.length || geometry.drawRange.start !== 0 || geometry.drawRange.count !== Infinity) continue;
    if (!byGeometry.has(geometry)) byGeometry.set(geometry, buildTree(geometry));
    const tree = byGeometry.get(geometry);
    if (tree) trees.set(object, tree);
  }
  const intersections: Intersection<Mesh>[] = [];
  const inverse = new Matrix4();
  const inverseLinear = new Matrix3();
  const localRay = new Ray();

  function blocks(ray: Raycaster, objects: readonly Mesh[]) {
    if (ray.far < ray.near) return false;
    for (const object of objects) {
      if (!object.layers.test(ray.layers)) continue;
      const materials = object.material;
      if (!Array.isArray(materials) && !materials?.visible) continue;
      const tree = trees.get(object);
      if (tree && !Array.isArray(materials)) {
        inverse.copy(object.matrixWorld).invert();
        localRay.origin.copy(ray.ray.origin).applyMatrix4(inverse);
        localRay.direction.copy(ray.ray.direction).applyMatrix3(inverseLinear.setFromMatrix4(inverse));
        // Convert the world-space distance along the ray, including any shear from parent transforms.
        const localPerWorld = localRay.direction.length();
        if (Number.isFinite(localPerWorld) && localPerWorld > 0) {
          localRay.direction.divideScalar(localPerWorld);
          if (tree.raycastFirst(localRay, materials, ray.near * localPerWorld, ray.far * localPerWorld)) return true;
          continue;
        }
      }
      intersections.length = 0;
      ray.intersectObject(object, false, intersections);
      const visibleHit = intersections.some(({ face }) => {
        const material = Array.isArray(materials) ? materials[face?.materialIndex ?? 0] : materials;
        return material?.visible;
      });
      intersections.length = 0;
      if (visibleHit) return true;
    }
    return false;
  }

  return { blocks, dispose() { trees.clear(); } };
}
