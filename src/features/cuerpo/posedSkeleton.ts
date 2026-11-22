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

// Contact vertices on bones.glb in meters. Each pair maps to one tracked joint,
// while the anatomical landmarks describe skin positions instead of bone surfaces.
const contacts = {
  left: {
    humerus: [0.203891, 1.037195, 0.071981],
    ulna: [0.207723, 1.035225, 0.067475],
    radius: [0.276404, 0.812310, 0.117148],
    carpals: [0.271189, 0.812700, 0.119951],
    femur: [0.060186, 0.376935, 0.073954],
    tibiaTop: [0.062074, 0.377948, 0.074627],
    tibiaBase: [0.052846, 0.000728, 0.083334],
    tarsals: [0.056133, 0.003340, 0.080136],
  },
  right: {
    humerus: [-0.202559, 1.036255, 0.071039],
    ulna: [-0.201698, 1.031535, 0.068761],
    radius: [-0.275784, 0.812061, 0.117961],
    carpals: [-0.271316, 0.812431, 0.119796],
    femur: [-0.062651, 0.379469, 0.074776],
    tibiaTop: [-0.063054, 0.378504, 0.075208],
    tibiaBase: [-0.052013, 0.001149, 0.083287],
    tarsals: [-0.055062, 0.004555, 0.076824],
  },
};
const spineTop = new Vector3(-0.010328, 1.438555, 0.085154);
const skullBase = new Vector3(-0.016980, 1.442981, 0.094408);

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
  const face = headPair ?? 'eye';
  const restHead = between(rest(`${face}_left`), rest(`${face}_right`));
  const neck = spineTop.clone().applyMatrix4(trunk);
  const observedHead = headPair ? between(at(`${face}_left`), at(`${face}_right`)) : null;
  const length = observedHead ? observedHead.distanceTo(neck) / restHead.distanceTo(skullBase) : 0;
  const head = observedHead && length >= stature*.55 && length <= stature*1.65 ? observedHead : null;
  const headSide = head ? vector(at(`${face}_right`), at(`${face}_left`)) : shoulderSide;
  const headScale = head ? Math.max(stature*.8, Math.min(stature*1.2,
    headSide.length() / rest(`${face}_left`).distanceTo(rest(`${face}_right`)))) : stature;
  matrices.set('head', fit(
    { start: skullBase, end: restHead, side: modelSide },
    { start: neck, end: head ?? restHead.clone().applyMatrix4(trunk), side: headSide }, headScale,
  ));

  for (const side of sides) {
    const contact = (bone: keyof typeof contacts.left) => new Vector3().fromArray(contacts[side][bone]);
    const sources: Record<keyof typeof limbJoints, [Vector3, Vector3]> = {
      upper_arm: [rest(`shoulder_${side}`), contact('humerus')],
      forearm: [contact('ulna'), contact('radius')],
      thigh: [rest(`hip_${side}`), contact('femur')],
      shin: [contact('tibiaTop'), contact('tibiaBase')],
    };
    for (const limb of Object.keys(limbJoints) as (keyof typeof limbJoints)[]) {
      const [from, to] = limbJoints[limb];
      const a = `${from}_${side}` as const, b = `${to}_${side}` as const;
      const start = at(a), end = at(b);
      const axis = vector(start, end);
      const [restStart, restEnd] = sources[limb];
      const sideDirection = bodyForward.clone().cross(axis);
      const restDirection = forward.clone().cross(vector(restStart, restEnd));
      matrices.set(`${limb}_${side}`, fit(
        { start: restStart, end: restEnd, side: restDirection },
        { start, end, side: sideDirection }, stature,
      ));
    }

    const wrist = `wrist_${side}` as const, elbow = `elbow_${side}` as const;
    const index = `index_${side}` as const, pinky = `pinky_${side}` as const;
    const restPalm: Segment = { start: contact('carpals'), end: between(rest(index), rest(pinky)), side: vector(rest(pinky), rest(index)) };
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
    const restAnkle = contact('tarsals');
    matrices.set(`foot_${side}`, fit(
      { start: restAnkle, end: restAnkle.clone().add(restFoot), side: restFoot.clone().cross(up) },
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
  const measured: [number, number, number][] = points.map(point => [
    point.x + skeleton.position.x, -point.y + skeleton.position.y, -(point.z ?? 0) + skeleton.position.z,
  ]);
  // Calibrate against joints used by the rig, with the eye/ear midpoint attached to the fitted skull.
  const fittedHead = restHead.clone().applyMatrix4(matrices.get('head')!).add(skeleton.position);
  skeleton.userData.calibrationJoints = {
    measured,
    face,
    head: fittedHead.toArray() as [number, number, number],
  };
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

export async function exportSkeleton(skeleton: Group, labelIds: readonly string[] = []) {
  const { USDZExporter } = await import('three/addons/exporters/USDZExporter.js');
  const scene = new Scene();
  scene.add(skeleton.clone());
  const labelTools = labelIds.length ? await import('./usdLabels') : null;
  const labels = labelTools?.buildUsdLabels(skeleton, labelIds);
  if (labels) scene.add(labels);
  scene.updateMatrixWorld(true);
  try {
    const data = await new USDZExporter().parseAsync(scene, {
      quickLookCompatible: true,
      ar: { anchoring: { type: 'plane' }, planeAnchoring: { alignment: 'horizontal' } },
    });
    return new Blob([data], { type: 'model/vnd.usdz+zip' });
  } finally {
    if (labels) labelTools?.disposeUsdLabels(labels);
  }
}
