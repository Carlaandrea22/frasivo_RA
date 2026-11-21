import { Mesh, Vector3, type Camera, type Object3D } from 'three';
import type { BoneTarget } from './BoneLabels';

export function projectBones(model: Object3D, camera: Camera, preferred?: Object3D): BoneTarget[] {
  model.updateMatrixWorld(true);
  camera.updateMatrixWorld();
  const targets = new Map<string, BoneTarget>();
  const point = new Vector3();
  model.traverseVisible(node => {
    const id = node.userData.term;
    if (!(node instanceof Mesh) || typeof id !== 'string' || (targets.has(id) && node !== preferred)) return;
    if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
    if (!node.geometry.boundingBox) return;
    node.geometry.boundingBox.getCenter(point);
    point.applyMatrix4(node.matrixWorld).project(camera);
    if (Math.abs(point.x) > 1 || Math.abs(point.y) > 1 || Math.abs(point.z) > 1) return;
    targets.set(id, { id, x: (point.x+1)/2, y: (1-point.y)/2 });
  });
  return [...targets.values()];
}
