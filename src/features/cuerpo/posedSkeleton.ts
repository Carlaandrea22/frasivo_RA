import { Box3, Group, Matrix4, Mesh, MeshStandardMaterial, Scene, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import anchors from '../../../assets/anatomy/body/anchors.json';
import bonesUrl from '../../../assets/anatomy/body/bones.glb?url';
import type { BodyPoint } from './anatomy';
import { atlasParts, landmark, limbJoints, sides, type Joint } from './atlasAlignment';

const bones = atlasParts.filter(part => part.layer === 'bones');
const up = new Vector3(0, 1, 0);
const across = new Vector3(1, 0, 0);
const forward = new Vector3(0, 0, 1);
const rest = (joint: Joint) => new Vector3().fromArray(anchors.anchors[joint]);
const between = (a: Vector3, b: Vector3) => a.clone().lerp(b, .5);
const vector = (a: Vector3, b: Vector3) => b.clone().sub(a);
const endAt = (from: Vector3, direction: Vector3, length: number) => from.clone().addScaledVector(direction, length);

function axes(axis: Vector3, side: Vector3) {
  const y = axis.clone().normalize();
  const lateral = [side, across, forward, up].find(candidate =>
    candidate.lengthSq() > 1e-6 && Math.abs(candidate.clone().normalize().dot(y)) < .985,
  )!;
  const z = lateral.clone().cross(y).normalize();
  return new Matrix4().makeBasis(y.clone().cross(z), y, z);
}

interface Segment {
  start: Vector3;
  end: Vector3;
  side: Vector3;
}

function fit(source: Segment, target: Segment, width: number, depth = width) {
  const from = vector(source.start, source.end), to = vector(target.start, target.end);
  if (from.lengthSq() < 1e-6 || to.lengthSq() < 1e-6) throw new Error('La pose tiene articulaciones superpuestas.');
  return new Matrix4().makeTranslation(target.start)
    .multiply(axes(to, target.side))
    .scale(new Vector3(width, to.length() / from.length(), depth))
    .multiply(axes(from, source.side).invert())
    .multiply(new Matrix4().makeTranslation(source.start.clone().negate()));
}

function bodyFrame(origin: Vector3, height: Vector3, side: Vector3, scale: Vector3) {
  return axes(height, side).scale(scale).setPosition(origin);
}

export function poseSkeleton(model: Group, points: BodyPoint[]) {
  function at(joint: Joint) {
    const { x, y, z } = points[landmark[joint]];
    // MediaPipe gives metres; convert from image axes to a Y-up, front +Z scene.
    return new Vector3(x, -y, -z!);
  }
  const seen = (joint: Joint, confidence = .5) => (points[landmark[joint]].visibility ?? 0) >= confidence;
  const leftShoulder = at('shoulder_left'), rightShoulder = at('shoulder_right');
  const leftHip = at('hip_left'), rightHip = at('hip_right');
  const hips = between(leftHip, rightHip), shoulders = between(leftShoulder, rightShoulder);
  const torsoUp = vector(hips, shoulders);
  const shoulderSide = vector(rightShoulder, leftShoulder), hipSide = vector(rightHip, leftHip);
  const modelSide = vector(rest('shoulder_right'), rest('shoulder_left'));
  const modelHips = between(rest('hip_left'), rest('hip_right'));
  const modelShoulders = between(rest('shoulder_left'), rest('shoulder_right'));
  const modelUp = vector(modelHips, modelShoulders);
  const width = shoulderSide.length() / modelSide.length();
  const hipWidth = hipSide.length() / rest('hip_left').distanceTo(rest('hip_right'));
  const stature = torsoUp.length() / modelUp.length();
  if ([width, hipWidth, stature].some(scale => !(scale >= .35 && scale <= 1.9))) throw new Error('La pose no tiene proporciones estables.');

  const orientation = axes(torsoUp, shoulderSide);
  const bodyForward = forward.clone().transformDirection(orientation);
  const trunk = bodyFrame(hips, torsoUp, shoulderSide, new Vector3(width, stature, stature))
    .multiply(bodyFrame(modelHips, modelUp, modelSide, new Vector3(1, 1, 1)).invert());
  const pelvis = bodyFrame(hips, torsoUp, hipSide, new Vector3(hipWidth, stature, hipWidth))
    .multiply(bodyFrame(modelHips, modelUp, vector(rest('hip_right'), rest('hip_left')), new Vector3(1, 1, 1)).invert());
  const matrices = new Map<string, Matrix4>([['trunk', trunk], ['abdomen', trunk], ['pelvis', pelvis]]);

  const headPair = (['eye', 'ear'] as const).find(kind =>
    sides.every(side => seen(`${kind}_${side}`, .6))
      && at(`${kind}_left`).distanceTo(at(`${kind}_right`)) > .025,
  );
  const headUp = torsoUp.clone().normalize();
  const restHead = headPair ? between(rest(`${headPair}_left`), rest(`${headPair}_right`))
    : between(rest('eye_left'), rest('eye_right'));
  const head = headPair ? between(at(`${headPair}_left`), at(`${headPair}_right`))
    : restHead.clone().applyMatrix4(trunk);
  const headSide = headPair ? vector(at(`${headPair}_right`), at(`${headPair}_left`)) : shoulderSide;
  const headScale = headPair ? Math.max(stature*.8, Math.min(stature*1.2,
    headSide.length() / rest(`${headPair}_left`).distanceTo(rest(`${headPair}_right`)))) : stature;
  matrices.set('head', bodyFrame(head, headUp, headSide, new Vector3().setScalar(headScale))
    .multiply(new Matrix4().makeTranslation(restHead.negate())));

  for (const side of sides) {
    for (const limb of Object.keys(limbJoints) as (keyof typeof limbJoints)[]) {
      const [from, to] = limbJoints[limb];
      const a = `${from}_${side}` as const, b = `${to}_${side}` as const;
      const start = at(a), end = at(b);
      const axis = vector(start, end);
      const restStart = rest(a), restEnd = rest(b);
      const sideDirection = bodyForward.clone().cross(axis);
      const restDirection = forward.clone().cross(vector(restStart, restEnd));
      matrices.set(`${limb}_${side}`, fit(
        { start: restStart, end: restEnd, side: restDirection },
        { start, end, side: sideDirection }, stature,
      ));
    }

    const wrist = `wrist_${side}` as const, elbow = `elbow_${side}` as const;
    const index = `index_${side}` as const, pinky = `pinky_${side}` as const;
    const restPalm: Segment = { start: rest(wrist), end: between(rest(index), rest(pinky)), side: vector(rest(pinky), rest(index)) };
    const palm = between(at(index), at(pinky));
    const wristAt = at(wrist);
    const palmLength = wristAt.distanceTo(palm), restPalmLength = restPalm.start.distanceTo(restPalm.end);
    const fingersTracked = seen(index) && seen(pinky) && palmLength >= .045 && palmLength <= .24;
    const forearm = vector(at(elbow), wristAt).normalize();
    matrices.set(`hand_${side}`, fit(restPalm, {
      start: wristAt,
      end: fingersTracked ? palm : endAt(wristAt, forearm, restPalmLength*stature),
      side: fingersTracked ? vector(at(pinky), at(index)) : shoulderSide.clone().multiplyScalar(side === 'left' ? 1 : -1),
    }, stature));

    const ankle = `ankle_${side}` as const, heel = `heel_${side}` as const, toe = `toe_${side}` as const;
    const ankleAt = at(ankle), heelAt = at(heel), toeAt = at(toe);
    const restFoot = vector(rest(heel), rest(toe));
    const foot = vector(heelAt, toeAt);
    const footObserved = seen(heel, .42) && seen(toe) && foot.length() >= .055 && foot.length() <= .30
      && heelAt.distanceTo(ankleAt) < .14;
    // Preserve the heading of a visible foot and limit extreme pitch from the depth estimate.
    if (footObserved) foot.y = Math.min(foot.length()*.38, Math.max(-foot.length()*.52, foot.y));
    else foot.copy(bodyForward).setY(-.16).normalize().multiplyScalar(restFoot.length()*stature);
    matrices.set(`foot_${side}`, fit(
      { start: rest(ankle), end: rest(ankle).add(restFoot), side: restFoot.clone().cross(up) },
      { start: ankleAt, end: ankleAt.clone().add(foot), side: foot.clone().cross(up) }, stature,
    ));
  }

  const placements = bones.map(part => {
    const mesh = model.getObjectByName(part.id);
    const placement = matrices.get(part.group);
    if (!(mesh instanceof Mesh) || !placement) throw new Error(`No se pudo colocar ${part.id}.`);
    return { part, mesh, placement };
  });
  const skeleton = new Group();
  skeleton.name = 'Posed_skeleton';
  const feet = new Box3();
  for (const { part, mesh, placement } of placements) {
    mesh.userData.term = part.term;
    mesh.updateMatrix();
    mesh.matrixAutoUpdate = false;
    mesh.matrix.premultiply(placement);
    mesh.matrixWorldNeedsUpdate = true;
    skeleton.add(mesh);
    if (part.group.startsWith('foot_')) feet.expandByObject(mesh, true);
  }
  const origin = between(at('ankle_left'), at('ankle_right'));
  skeleton.position.set(-origin.x, -feet.min.y, -origin.z);
  skeleton.updateMatrixWorld(true);
  return skeleton;
}

export function disposeSkeleton(skeleton: Group) {
  const materials = new Set<MeshStandardMaterial>();
  skeleton.traverse(node => {
    if (node instanceof Mesh) {
      node.geometry.dispose();
      if (node.material instanceof MeshStandardMaterial) materials.add(node.material);
    }
  });
  for (const material of materials) material.dispose();
}

export async function loadPosedSkeleton(points: BodyPoint[]) {
  const { scene } = await new GLTFLoader().loadAsync(bonesUrl);
  // Validate before moving meshes so a failed assembly can dispose the original GLB.
  try {
    return poseSkeleton(scene, points);
  } catch (error) {
    disposeSkeleton(scene);
    throw error;
  }
}

export async function exportSkeleton(skeleton: Group) {
  const { USDZExporter } = await import('three/addons/exporters/USDZExporter.js');
  const scene = new Scene();
  scene.add(skeleton.clone());
  const data = await new USDZExporter().parseAsync(scene, {
    quickLookCompatible: true,
    ar: { anchoring: { type: 'plane' }, planeAnchoring: { alignment: 'horizontal' } },
  });
  return new Blob([data], { type: 'model/vnd.usdz+zip' });
}
