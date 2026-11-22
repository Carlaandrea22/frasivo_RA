import type { AnatomyLayer, BodyPoint } from './anatomy';
import { atlasPlacement, landmark, landmarkRejection, limbJoints, pointInFrame, sides, visibleRegion, type AtlasPart, type Joint, type ProjectionRejections } from './atlasAlignment';
import type { PoseSupport } from './livePose';
import type { FaceRegion, HandRegion } from './regionalDetection';
import type { RegionalFoot, RegionalNeck } from './regionalTransforms';

type Group = AtlasPart['group'];
type Side = typeof sides[number];
type Point = readonly [number, number];

const separation = (a: Point, b: Point) => Math.hypot(a[0]-b[0], a[1]-b[1]);
const center = (a: Point, b: Point): Point => [(a[0]+b[0])/2, (a[1]+b[1])/2];
const sideName = (side: Side, female = false) => side === 'left' ? (female ? 'izquierda' : 'izquierdo') : (female ? 'derecha' : 'derecho');
const limbNames = { upper_arm: 'brazo', forearm: 'antebrazo', thigh: 'muslo', shin: 'pierna' };

function span(points: readonly BodyPoint[], aspect: number) {
  const xs = points.map(point => point.x*aspect);
  const ys = points.map(point => point.y);
  return { width: Math.max(...xs)-Math.min(...xs), height: Math.max(...ys)-Math.min(...ys) };
}

export function chooseRegions(points: BodyPoint[], aspect: number, viewportAspect: number,
  hands: readonly HandRegion[], face: FaceRegion | null, facing: ReturnType<typeof atlasPlacement>['facing'],
  confirmed: ReadonlySet<string> = new Set(), layer: AnatomyLayer = 'bones', support?: PoseSupport, debug = false) {
  const [left, top, width, height] = visibleRegion(aspect, viewportAspect);
  const margin = .01 * Math.min(width, height);
  const inside = (point: BodyPoint, border = margin) => Number.isFinite(point.x) && Number.isFinite(point.y)
    && point.x*aspect >= left+border && point.x*aspect <= left+width-border && point.y >= top+border && point.y <= top+height-border;
  const bounds: [number, number, number, number] = [left+margin, top+margin, width-2*margin, height-2*margin];
  const at = (joint: Joint, confidence = .65, useSupport = false) =>
    pointInFrame(points[landmark[joint]], aspect, bounds, useSupport && support?.has(landmark[joint]) ? 0 : confidence);
  const value = (joint: Joint) => points[landmark[joint]];
  const acceptedHands = hands.filter(hand => hand.confidence >= (confirmed.has(`detail_hand_${hand.side}`) ? .46 : .5) && hand.landmarks.length === 21
    && [0,5,9,13,17].every(index => inside(hand.landmarks[index]))
    && hand.landmarks.filter(point => inside(point, 0)).length >= 17
    && span(hand.landmarks, aspect).height + span(hand.landmarks, aspect).width > height*.05);

  const acceptedFace = face && face.landmarks.length > 454
    && [1, 10, 152].every(index => inside(face.landmarks[index], 0))
    && span(face.landmarks, aspect).height > height*(confirmed.has('detail_face') ? .075 : .09) ? face : null;
  const faceSize = acceptedFace ? span(acceptedFace.landmarks, aspect) : null;
  const handSize = Math.max(0, ...acceptedHands.map(hand => {
    const size = span(hand.landmarks, aspect);
    return Math.max(size.width, size.height);
  }));

  const sl = at('shoulder_left'), sr = at('shoulder_right'), hl = at('hip_left'), hr = at('hip_right');
  const shoulders = sl && sr ? center(sl, sr) : null;
  const hips = hl && hr ? center(hl, hr) : null;
  const shoulderWidth = sl && sr ? separation(sl, sr) : 0;
  const trunkLength = shoulders && hips ? separation(shoulders, hips) : 0;
  const torsoScale = shoulderWidth || (hl && hr ? separation(hl, hr)*1.8 : 0);
  const torso = Boolean(shoulders && shoulderWidth >= height*.09
    && Math.abs(sl![0]-sr![0]) > shoulderWidth*.65
    && (!hips || (trunkLength > shoulderWidth*.55 && trunkLength < shoulderWidth*2.8 && hips[1] > shoulders[1])));
  const largeHandOverrides = handSize >= height*.15 && (!torso || shoulderWidth < handSize*1.45);
  const chin = acceptedFace?.landmarks[152].y;
  const neckLength = shoulders && chin !== undefined ? shoulders[1]-chin : 0;
  const elbows = at('elbow_left') && at('elbow_right');
  const largeFaceOverrides = Boolean(faceSize && faceSize.height > height*.22
    && (!torso || shoulderWidth < faceSize.height*.92 || neckLength < faceSize.height*.13 || (!hips && !elbows)));
  const contradicted = largeHandOverrides || largeFaceOverrides;
  const back = facing === 'back' && torso && !contradicted;
  const visibleHands = back ? [] : acceptedHands;
  const visibleFace = back ? null : acceptedFace;
  const groups = new Set<Group>();
  const reasons: string[] = [];
  const feet: RegionalFoot[] = [];
  const rejected: ProjectionRejections | undefined = debug ? new Map() : undefined;
  const reject = (group: Group, joints: Joint[], confidence: number, useSupport = false) => {
    if (rejected) rejected.set(group, landmarkRejection(points, joints.map(joint => landmark[joint]), aspect, bounds,
      confidence, useSupport ? support : undefined));
  };
  const eyeLeft = at('eye_left'), eyeRight = at('eye_right');
  const earLeft = at('ear_left', .55), earRight = at('ear_right', .55);
  const poseHead = torso && shoulders && eyeLeft && eyeRight && earLeft && earRight
    && Math.max(eyeLeft[1], eyeRight[1]) < shoulders[1] - shoulderWidth*.12
    && separation(eyeLeft, eyeRight) < shoulderWidth*.50;
  const neckConfidence = layer === 'bones' || hips || elbows ? .65 : confirmed.has('neck') ? .79 : .83;
  const neck: RegionalNeck | null = faceSize && sl && sr && !largeHandOverrides
    && at('shoulder_left', neckConfidence) && at('shoulder_right', neckConfidence)
    && shoulderWidth > faceSize.width*.95 && neckLength > faceSize.height*.10 && neckLength < faceSize.height*.8
    ? { shoulderLeft: value('shoulder_left'), shoulderRight: value('shoulder_right') } : null;

  if (contradicted) reasons.push(largeHandOverrides ? 'Pose no coincide con la escala de la mano' : 'Pose no coincide con la escala de la cara');
  else if (facing !== 'back' || back) {
    const missing: string[] = [];
    const disproportionate: string[] = [];
    if (torso && (facing === 'front' || back)) {
      groups.add('trunk');
      if (hips) { groups.add('pelvis'); groups.add('abdomen'); }
      else if (rejected) {
        reject('pelvis', ['hip_left', 'hip_right'], .65);
        reject('abdomen', ['hip_left', 'hip_right'], .65);
      }
    } else {
      reasons.push('Hombros fuera del encuadre o torso desproporcionado');
      if (rejected) reject('trunk', ['shoulder_left', 'shoulder_right'], .65);
    }
    if (!back && (!acceptedFace || layer !== 'bones') && poseHead) groups.add('head');
    if (back && layer === 'bones' && earLeft && earRight) groups.add('head');
    if (rejected && !groups.has('head') && !visibleFace) {
      if (!earLeft || !earRight) reject('head', ['ear_left', 'ear_right'], .55);
      else if (!back) reject('head', ['eye_left', 'eye_right'], .65);
    }
    for (const side of sides) {
      const supported = (joint: string, threshold?: number) => at(`${joint}_${side}` as Joint, threshold, torso && facing === 'front');
      const chain = [
        ['shoulder','elbow','wrist'],
        ['hip','knee','ankle'],
      ].map(parts => parts.every(joint => supported(joint, .62)));
      for (const limb of Object.keys(limbJoints) as (keyof typeof limbJoints)[]) {
        const leg = limb === 'thigh' || limb === 'shin';
        const [a, b] = limbJoints[limb];
        const group = `${limb}_${side}` as const;
        // Keep an established fit through small confidence dips as long as
        // both measured endpoints still meet the frame and size constraints.
        const confidence = (torso ? .62 : .7) - (confirmed.has(group) ? .06 : 0);
        const from = supported(a, confidence), to = supported(b, confidence);
        const name = `${limbNames[limb]} ${sideName(side, limb === 'shin')}`;
        if (!from || !to || (!torso && !chain[Number(leg)])) {
          missing.push(name);
          if (rejected) {
            if (from && to) rejected.set(group, 'árbitro regional');
            else reject(group, [`${a}_${side}`, `${b}_${side}`] as Joint[], confidence, torso && facing === 'front');
          }
          continue;
        }
        const length = separation(from, to);
        if (length < height*.035 || (torsoScale && (length < torsoScale*.27 || length > torsoScale*2.5))) {
          disproportionate.push(name);
          rejected?.set(group, 'escala o profundidad');
          continue;
        }
        groups.add(group);
      }
      if (torso && !visibleHands.some(hand => hand.side === side) && supported('wrist')
        && supported('index', .55) && supported('pinky', .55) && supported('thumb', .55)) groups.add(`hand_${side}`);

      if (rejected && !groups.has(`hand_${side}`) && !visibleHands.some(hand => hand.side === side)) {
        if (!supported('wrist')) reject(`hand_${side}`, [`wrist_${side}`], .65);
        else reject(`hand_${side}`, [`index_${side}`, `pinky_${side}`, `thumb_${side}`], .55);
      }

      const ankle = supported('ankle', .59), heel = supported('heel', .40), toe = supported('toe', .56);
      const knee = supported('knee', .62);
      if (ankle && heel && toe && (torso || knee)) {
        const length = separation(heel, toe);
        const shinLength = knee ? separation(knee, ankle) : shoulderWidth;
        const supportedFoot = support?.has(landmark[`heel_${side}`]) && support.has(landmark[`toe_${side}`]);
        if (length >= height*(supportedFoot ? .009 : .013) && shinLength > height*.055 && length < shinLength*.95
          && separation(heel, ankle) < length*1.25) {
          if (back) groups.add(`foot_${side}`);
          else feet.push({ side, ankle: value(`ankle_${side}`), heel: value(`heel_${side}`), toe: value(`toe_${side}`) });
        }
      }
      const foot = `foot_${side}` as const;
      if (rejected && !groups.has(foot) && !feet.some(entry => entry.side === side)) {
        const useSupport = torso && facing === 'front';
        if (!ankle) reject(foot, [`ankle_${side}`], .59, useSupport);
        else if (!heel) reject(foot, [`heel_${side}`], .40, useSupport);
        else if (!toe) reject(foot, [`toe_${side}`], .56, useSupport);
        else rejected.set(foot, torso || knee ? 'escala o profundidad' : 'árbitro regional');
      }
    }
    if (missing.length) reasons.push(`Extremos fuera de cuadro o sin apoyo: ${missing.join(', ')}`);
    if (disproportionate.length) reasons.push(`Proporción incoherente: ${disproportionate.join(', ')}`);
  } else reasons.push('Pose está de espaldas');

  const headSeen = Boolean(visibleFace || groups.has('head'));
  const fullBody = !contradicted && torso && facing === 'front' && headSeen && Boolean(hips)
    && sides.every(side => groups.has(`thigh_${side}`) && groups.has(`shin_${side}`))
    && Math.max(...sides.map(side => value(`ankle_${side}`).y)) - shoulders![1] >= height*.36;
  const detailedHands = fullBody && sides.some(side => {
    const wrist = at(`wrist_${side}`, .45), index = at(`index_${side}`, .45);
    return wrist && index && separation(wrist, index) >= height*.024;
  });
  const detailedFace = Boolean(fullBody && layer !== 'bones' && eyeLeft && eyeRight
    && separation(eyeLeft, eyeRight) >= height*.019);
  let status = 'Buscando…';
  if (fullBody) status = 'Cuerpo completo';
  else if (back) status = 'Espalda';
  else if (groups.has('trunk')) status = 'Torso';
  else if (visibleHands.length > 1) status = 'Ambas manos';
  else if (visibleHands.length === 1) status = `Mano ${sideName(visibleHands[0].side, true)}`;
  else if (headSeen) status = 'Cabeza';
  else if (feet.length === 1) status = `Pie ${sideName(feet[0].side)}`;
  else if (feet.length === 2) status = 'Ambos pies';
  else {
    const limb = sides.find(side => groups.has(`upper_arm_${side}`) || groups.has(`forearm_${side}`));
    const leg = sides.find(side => groups.has(`thigh_${side}`) || groups.has(`shin_${side}`));
    if (limb) status = `Brazo ${sideName(limb)}`;
    else if (leg) status = `Pierna ${sideName(leg, true)}`;
  }
  if (!feet.length) reasons.push('Faltan puntos coherentes de tobillo, talón y punta');
  if (fullBody && poseHead) groups.add('head');
  const legsMissingAnkle = sides.filter(side => groups.has(`thigh_${side}`) && !groups.has(`shin_${side}`)
    && !at(`ankle_${side}`, .59, torso && facing === 'front'));
  return { groups, hands: visibleHands, face: fullBody && poseHead && layer === 'bones' ? null : visibleFace,
    feet, neck, status, reasons, rejected, fullBody, detailedHands, detailedFace, legsMissingAnkle };
}

// Only acquire a region after two consecutive observations. Invalidated
// matrices are never kept on screen while waiting for the next acquisition.
export function confirmRegions(previous: ReadonlySet<string>, current: ReadonlySet<string>, confirmed: ReadonlySet<string>) {
  return new Set([...current].filter(key => previous.has(key) || confirmed.has(key)));
}
