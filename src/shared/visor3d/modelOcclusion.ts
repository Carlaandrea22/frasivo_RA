import {
  Float16BufferAttribute, InterleavedBufferAttribute, Matrix3, Matrix4, Mesh, Ray,
  type BufferGeometry, type Intersection, type Object3D, type Raycaster,
} from 'three';
import { MeshBVH, type SerializedBVH } from 'three-mesh-bvh';
import type { OcclusionGeometry } from './modelOcclusion.worker';

export function createModelOcclusion(objects: readonly Object3D[]) {
  const trees = new Map<Mesh, MeshBVH>();
  const intersections: Intersection<Mesh>[] = [];
  const inverse = new Matrix4();
  const inverseLinear = new Matrix3();
  const localRay = new Ray();
  let ready = false;
  let worker: Worker | undefined;

  function cancel() {
    worker?.terminate();
    worker = undefined;
  }

  function build(onReady: () => void) {
    if (ready || worker) return;
    const meshesByGeometry = new Map<BufferGeometry, Mesh[]>();
    const inputs: OcclusionGeometry[] = [];
    const transfer: ArrayBuffer[] = [];
    for (const object of objects) {
      // Native raycasting handles skinning, instances, morph targets and material groups.
      if (!(object instanceof Mesh) || object.constructor !== Mesh || object.morphTargetInfluences
        || Array.isArray(object.material)) continue;
      const { geometry } = object;
      const position = geometry.getAttribute('position');
      const count = geometry.index?.count ?? position?.count ?? 0;
      if (geometry.groups.length || geometry.drawRange.start !== 0 || geometry.drawRange.count !== Infinity
        || position?.itemSize !== 3 || position instanceof Float16BufferAttribute || count < 3 || count % 3) continue;
      const meshes = meshesByGeometry.get(geometry);
      if (meshes) {
        meshes.push(object);
        continue;
      }
      meshesByGeometry.set(geometry, [object]);
      // Transfer copies so the renderer and native picking keep their original buffers.
      const positions = position.array.slice();
      const index = geometry.index?.array.slice() ?? null;
      transfer.push(positions.buffer);
      if (index) transfer.push(index.buffer);
      const interleaved = position instanceof InterleavedBufferAttribute;
      inputs.push({
        positions, index, normalized: position.normalized,
        stride: interleaved ? position.data.stride : 3,
        offset: interleaved ? position.offset : 0,
      });
    }
    const geometries = [...meshesByGeometry];
    const finish = () => {
      ready = true;
      onReady();
    };
    if (inputs.length === 0) {
      finish();
      return;
    }
    try {
      const pending = new Worker(new URL('./modelOcclusion.worker.ts', import.meta.url), { type: 'module' });
      worker = pending;
      const complete = (result?: (SerializedBVH | null)[]) => {
        if (worker !== pending) return;
        cancel();
        if (Array.isArray(result) && result.length === geometries.length) {
          result.forEach((data, i) => {
            if (!data) return;
            const [geometry, meshes] = geometries[i];
            try {
              const tree = MeshBVH.deserialize(data, geometry, { setIndex: false });
              for (const mesh of meshes) trees.set(mesh, tree);
            } catch {
              // Keep using native raycasting for this geometry.
            }
          });
        }
        finish();
      };
      pending.onmessage = ({ data }) => complete(data);
      pending.onerror = pending.onmessageerror = () => complete();
      pending.postMessage(inputs, transfer);
    } catch {
      cancel();
      finish();
    }
  }

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

  return {
    get ready() { return ready; },
    get started() { return ready || worker !== undefined; },
    blocks, build, cancel,
    dispose() {
      cancel();
      trees.clear();
    },
  };
}
