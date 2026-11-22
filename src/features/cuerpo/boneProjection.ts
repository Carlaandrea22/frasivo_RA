import { Mesh, Raycaster, Vector3, type BufferGeometry, type Camera, type Object3D } from 'three';
import { atlasParts } from './atlasAlignment';
import { boneSpritePoints, type BoneTarget } from './boneLabelPlacement';

const bones = new Map(atlasParts.filter(part => part.layer === 'bones').map(part => [part.id, part]));
const anchors = new WeakMap<BufferGeometry, Vector3[]>();

function surfacePoints(node: Mesh) {
  const geometry = node.geometry;
  const cached = anchors.get(geometry);
  if (cached) return cached;
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) return [];
  const atlas = bones.get(node.name);
  const center = box.getCenter(new Vector3());
  const screenPoints = atlas ? boneSpritePoints(node.name, atlas.demoSprite ?? atlas.sprite)
    : [[center.x, -center.y]];
  const mesh = new Mesh(geometry, node.material);
  const ray = new Raycaster();
  const vertices = geometry.attributes.position;
  const points = screenPoints.map(([x, svgY]) => {
    const y = -svgY;
    ray.ray.origin.set(x, y, box.max.z + .01);
    ray.ray.direction.set(0, 0, -1);
    const hit = ray.intersectObject(mesh, false)[0];
    if (hit) return hit.point;

    let closest = Infinity;
    const point = new Vector3();
    const best = new Vector3();
    for (let i = 0; i < vertices.count; i++) {
      point.fromBufferAttribute(vertices, i);
      const distance = (x-point.x)**2 + (y-point.y)**2;
      if (distance < closest) { closest = distance; best.copy(point); }
    }
    return best;
  });
  anchors.set(geometry, points);
  return points;
}

export function projectBones(model: Object3D, camera: Camera, preferred?: Object3D): BoneTarget[] {
  model.updateMatrixWorld(true);
  camera.updateMatrixWorld();
  const projected = new Vector3();
  const cameraSpace = new Vector3();
  const trunk = model.getObjectByName('sternum') ?? model.getObjectByName('spine');
  const trunkPoints = trunk instanceof Mesh ? surfacePoints(trunk) : [];
  let centerX = .5;
  if (trunk && trunkPoints.length) {
    projected.set(0, 0, 0);
    for (const point of trunkPoints) projected.add(point);
    projected.divideScalar(trunkPoints.length).applyMatrix4(trunk.matrixWorld).project(camera);
    centerX = (projected.x+1)/2;
  }
  const primary: BoneTarget[] = [];
  const targets: BoneTarget[] = [];
  model.traverseVisible(node => {
    const id = node.userData.term;
    if (!(node instanceof Mesh) || typeof id !== 'string') return;
    for (const point of surfacePoints(node)) {
      projected.copy(point).applyMatrix4(node.matrixWorld);
      if (cameraSpace.copy(projected).applyMatrix4(camera.matrixWorldInverse).z >= 0) continue;
      projected.project(camera);
      if (Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1 || Math.abs(projected.z) > 1) continue;
      const target = { id, centerX, source: node.name, x: (projected.x+1)/2, y: (1-projected.y)/2 };
      (node === preferred ? primary : targets).push(target);
    }
  });
  return [...primary, ...targets];
}
