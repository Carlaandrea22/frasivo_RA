import {
  Box3, CanvasTexture, ConeGeometry, CylinderGeometry, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial,
  Raycaster, Shape, ShapeGeometry, SRGBColorSpace, Vector3,
} from 'three';
import { anatomyParts, type AnatomyPart } from './anatomy';

const up = new Vector3(0, 1, 0);
const intoModel = new Vector3(0, 0, -1);

function cardTexture(term: AnatomyPart) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 184;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudieron dibujar las etiquetas.');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#17352f';
  context.font = '800 58px Manrope, sans-serif';
  context.fillText(term.es, 34, 84, 444);
  context.fillStyle = '#465f58';
  context.font = '500 39px Manrope, sans-serif';
  context.fillText(term.en, 34, 143, 444);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function cardGeometry(width: number, height: number) {
  const x = width / 2, y = height / 2, r = height * .16;
  const shape = new Shape();
  shape.moveTo(-x + r, -y);
  shape.lineTo(x - r, -y);
  shape.quadraticCurveTo(x, -y, x, -y + r);
  shape.lineTo(x, y - r);
  shape.quadraticCurveTo(x, y, x - r, y);
  shape.lineTo(-x + r, y);
  shape.quadraticCurveTo(-x, y, -x, y - r);
  shape.lineTo(-x, -y + r);
  shape.quadraticCurveTo(-x, -y, -x + r, -y);
  const geometry = new ShapeGeometry(shape, 5);
  const positions = geometry.attributes.position;
  const uv = [];
  for (let i = 0; i < positions.count; i++) {
    uv.push(positions.getX(i) / width + .5, positions.getY(i) / height + .5);
  }
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  return geometry;
}

function pointOnBone(mesh: Mesh) {
  const bounds = new Box3().setFromObject(mesh, true);
  const center = bounds.getCenter(new Vector3());
  const ray = new Raycaster(new Vector3(center.x, center.y, bounds.max.z + .01), intoModel);
  const hit = ray.intersectObject(mesh)[0]?.point;
  if (hit) return hit;

  const positions = mesh.geometry.attributes.position;
  const vertex = new Vector3();
  let closest = Infinity;
  const point = center.clone();
  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
    const distance = vertex.distanceToSquared(center);
    if (distance < closest) {
      closest = distance;
      point.copy(vertex);
    }
  }
  return point;
}

function addArrow(group: Group, from: Vector3, to: Vector3, material: MeshStandardMaterial, scale: number) {
  const axis = to.clone().sub(from);
  const length = axis.length();
  if (length < .001) return;
  axis.normalize();
  const tipLength = Math.min(.034 * scale, length * .5);
  const shaftLength = length - tipLength;
  const shaft = new Mesh(new CylinderGeometry(.003 * scale, .003 * scale, shaftLength, 8), material);
  shaft.name = 'Arrow_shaft';
  shaft.quaternion.setFromUnitVectors(up, axis);
  shaft.position.copy(from).addScaledVector(axis, shaftLength / 2);
  const tip = new Mesh(new ConeGeometry(.010 * scale, tipLength, 12), material);
  tip.name = 'Arrow_tip';
  tip.quaternion.copy(shaft.quaternion);
  tip.position.copy(to).addScaledVector(axis, -tipLength / 2);
  group.add(shaft, tip);
}

export function buildUsdLabels(skeleton: Group, ids: readonly string[]) {
  const labels = new Group();
  labels.name = 'Bone_labels';
  if (!ids.length) return labels;

  const meshes: Mesh[] = [];
  skeleton.traverse(node => {
    if (node instanceof Mesh && typeof node.userData.term === 'string') meshes.push(node);
  });
  const choices = new Map<string, { term: AnatomyPart; point: Vector3 }>();
  skeleton.updateWorldMatrix(true, true);
  for (const id of ids) {
    const mesh = meshes.find(node => node.name === id) ?? meshes.find(node => node.userData.term === id);
    const term = anatomyParts.find(part => part.layer === 'bones' && part.id === mesh?.userData.term);
    if (mesh && term && !choices.has(term.id)) choices.set(term.id, { term, point: pointOnBone(mesh) });
  }
  if (!choices.size) return labels;

  const bounds = new Box3().setFromObject(skeleton, true);
  const scale = Math.max(.45, (bounds.max.y - bounds.min.y) / 1.65);
  const centerX = (bounds.min.x + bounds.max.x) / 2;
  const height = .097 * scale;
  const width = height * 512 / 184;
  const front = bounds.max.z + .045 * scale;
  const gap = height + .021 * scale;
  const card = cardGeometry(width, height);
  const ink = new MeshStandardMaterial({ color: '#1e4b3d', roughness: .65 });
  const entries = [...choices.values()];
  const columns = { left: [] as typeof entries, right: [] as typeof entries };
  for (const item of entries) {
    const offset = item.point.x - centerX;
    const left = Math.abs(offset) < .035 * scale ? columns.left.length <= columns.right.length : offset < 0;
    columns[left ? 'left' : 'right'].push(item);
  }

  try {
    for (const [sign, column] of [[-1, columns.left], [1, columns.right]] as const) {
      const edge = (sign < 0 ? bounds.min.x : bounds.max.x) + sign * .065 * scale;
      let previous = bounds.min.y + height / 2 - gap;
      for (const { term, point } of column.sort((a, b) => a.point.y - b.point.y)) {
        const y = Math.max(point.y, previous + gap);
        previous = y;
        const label = new Group();
        label.name = `Label_${term.id}`;
        labels.add(label);
        const texture = cardTexture(term);
        const face = new Mesh(card, new MeshStandardMaterial({ map: texture, roughness: .85 }));
        face.name = 'Bilingual_card';
        face.position.set(edge + sign * width / 2, y, front);
        label.add(face);
        addArrow(label, new Vector3(edge, y, front), point, ink, scale);
      }
    }
  } catch (error) {
    disposeUsdLabels(labels);
    card.dispose();
    ink.dispose();
    throw error;
  }
  // The exporter reads each local matrix directly.
  labels.updateMatrixWorld(true);
  return labels;
}

export function disposeUsdLabels(labels: Group) {
  labels.traverse(node => {
    if (!(node instanceof Mesh) || !(node.material instanceof MeshStandardMaterial)) return;
    node.geometry.dispose();
    node.material.map?.dispose();
    node.material.dispose();
  });
}
