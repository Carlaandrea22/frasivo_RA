import type { BodyPoint } from './anatomy';
import { landmark, pointInFrame, sides, visibleRegion } from './atlasAlignment';

export type PoseSupport = ReadonlyMap<number, 'observed' | 'inferred'>;
export type FramingIssue = 'waist' | 'legs';

type Chain = [start: BodyPoint, joint: BodyPoint, end: BodyPoint];
interface Observation {
  points: Chain;
  torso: number;
  time: number;
}

export interface LivePose {
  time: number;
  points: BodyPoint[];
  support: PoseSupport;
  framing?: FramingIssue;
  observations: ReadonlyMap<number, Observation>;
}

const persistenceMs = 400;
const exitConfidence = .30;
const chains = sides.flatMap(side => [
  { start: landmark[`shoulder_${side}`], joint: landmark[`elbow_${side}`], end: landmark[`wrist_${side}`], leg: false },
  { start: landmark[`hip_${side}`], joint: landmark[`knee_${side}`], end: landmark[`ankle_${side}`], leg: true },
]);
const shoulders = [landmark.shoulder_left, landmark.shoulder_right] as const;
const hips = [landmark.hip_left, landmark.hip_right] as const;
const knees = [landmark.knee_left, landmark.knee_right] as const;
const ankles = [landmark.ankle_left, landmark.ankle_right] as const;

const confidence = (point: BodyPoint | undefined) => point?.visibility ?? 0;
const finite = (point: BodyPoint | undefined): point is BodyPoint =>
  !!point && Number.isFinite(point.x) && Number.isFinite(point.y);

export function stabilizeLivePose(raw: BodyPoint[], time: number, aspect: number, viewportAspect: number, previous?: LivePose): LivePose {
  const points = raw.slice();
  if (previous && (time < previous.time || time-previous.time > persistenceMs)) previous = undefined;
  const support = new Map<number, 'observed' | 'inferred'>();
  const observations = new Map<number, Observation>();
  const result: LivePose = { time, points, support, observations };
  const frame = visibleRegion(aspect, viewportAspect);
  const [left, top, width, height] = frame;
  const bottom = top + height;
  const inset = .01 * Math.min(width, height);
  const safeFrame: typeof frame = [left+inset, top+inset, width-2*inset, height-2*inset];
  const inside = (point: BodyPoint | undefined): point is BodyPoint =>
    Boolean(pointInFrame(point, aspect, safeFrame, 0));
  const distance = (a: BodyPoint, b: BodyPoint) => Math.hypot((a.x-b.x)*aspect, a.y-b.y);
  const [sl, sr] = shoulders.map(index => raw[index]);
  if (!inside(sl) || !inside(sr) || Math.min(confidence(sl), confidence(sr)) < .80) return result;
  const shoulderWidth = distance(sl, sr);
  if ((sl.x-sr.x)*aspect < Math.max(height*.065, shoulderWidth*.70)) return result;
  const [hl, hr] = hips.map(index => raw[index]);
  const shoulderY = (sl.y+sr.y)/2;
  const hipY = finite(hl) && finite(hr) ? (hl.y+hr.y)/2 : 0;
  const torso = hipY-shoulderY;
  const below = (index: number) => finite(raw[index]) && raw[index].y > bottom;
  if (torso > shoulderWidth*.5 && torso < shoulderWidth*3.2) {
    if (knees.every(below) && ankles.every(below)) result.framing = 'waist';
    else if (hips.some(index => confidence(raw[index]) >= .65)
      && ankles.some(below)) result.framing = 'legs';
  }
  if (!inside(hl) || !inside(hr) || Math.min(confidence(hl), confidence(hr)) < .80
    || (hl.x-hr.x)*aspect < shoulderWidth*.18 || torso < shoulderWidth*.55 || torso > shoulderWidth*2.8
    || Math.abs((hl.x+hr.x-sl.x-sr.x)*aspect/2) > shoulderWidth*.47) return result;

  function plausibleLink(a: BodyPoint, b: BodyPoint, leg: boolean) {
    const length = distance(a, b);
    return length >= torso*(leg ? .36 : .16) && length <= torso*(leg ? 1.32 : 1.05)
      && (!leg || b.y-a.y >= length*.64);
  }

  for (const { start, joint, end, leg } of chains) {
    const a = raw[start], b = raw[joint], c = raw[end];
    const enter = leg ? .38 : .50;
    const eligible = (point: BodyPoint | undefined, index: number): point is BodyPoint => inside(point)
      && confidence(point) >= (previous?.support.has(index) ? exitConfidence : enter);
    const old = previous?.observations.get(joint);
    const history = old && time >= old.time && time-old.time <= persistenceMs && distance(a, old.points[0]) < torso*.22
      && torso/old.torso > .78 && torso/old.torso < 1.28 ? old : undefined;
    if (history) observations.set(joint, history);

    let middle = eligible(b, joint) && plausibleLink(a, b, leg) ? b : undefined;
    let distal = eligible(c, end) ? c : undefined;
    if (middle && distal && !plausibleLink(middle, distal, leg)) {
      if (confidence(middle) > confidence(distal) || !leg) distal = undefined;
      else middle = undefined;
    }
    if (!middle && distal && confidence(b) < enter && (!finite(b) || inside(b))
      && confidence(distal) >= (leg ? .38 : .50) && distance(a, distal) >= torso*(leg ? .72 : .43)) {
      const [p, q, r] = history?.points ?? [];
      // Express the previous bend in the coordinate system of the two ends.
      // The straight-chain default uses the proximal share of the atlas limb.
      const ux = (distal.x-a.x)*aspect, uy = distal.y-a.y;
      let along = leg ? .55 : .56;
      let across = 0;
      if (p && q && r) {
        const dx = (r.x-p.x)*aspect, dy = r.y-p.y;
        const qx = (q.x-p.x)*aspect, qy = q.y-p.y;
        const squared = dx*dx+dy*dy;
        if (squared > .0001) {
          along = Math.max(.34, Math.min(.69, (qx*dx+qy*dy)/squared));
          across = Math.max(-.28, Math.min(.28, (qy*dx-qx*dy)/squared));
        }
      }
      const estimated = { ...b, x: a.x+(along*ux-across*uy)/aspect, y: a.y+along*uy+across*ux,
        z: (a.z ?? 0) + along*((distal.z ?? 0)-(a.z ?? 0)) };
      const consistent = finite(b) ? distance(estimated, b) < torso*.22
        : confidence(distal) >= .65 && distance(a, distal) >= torso*(leg ? 1.35 : .75);
      if (inside(estimated) && plausibleLink(a, estimated, leg) && plausibleLink(estimated, distal, leg)
        && (history || consistent)) middle = estimated;
    }
    if (middle && !distal && history && confidence(c) < enter && (!finite(c) || inside(c))) {
      const [, p, q] = history.points;
      const scale = torso/history.torso;
      const estimated = { ...c, x: middle.x+(q.x-p.x)*scale, y: middle.y+(q.y-p.y)*scale,
        z: (middle.z ?? 0)+((q.z ?? 0)-(p.z ?? 0))*scale };
      if (inside(estimated) && distance(middle, p) < torso*.25 && plausibleLink(middle, estimated, leg)
        && (!finite(c) || distance(c, estimated) < torso*.18)) distal = estimated;
    }
    if (!middle || !distal || !plausibleLink(middle, distal, leg)) continue;
    points[joint] = middle;
    points[end] = distal;
    support.set(start, 'observed');
    support.set(joint, middle === b ? 'observed' : 'inferred');
    support.set(end, distal === c ? 'observed' : 'inferred');
    if (middle === b && distal === c && Math.min(confidence(b), confidence(c)) >= enter) {
      observations.set(joint, { points: [a, b, c], torso, time });
    }
  }

  for (const side of sides) {
    const ankle = landmark[`ankle_${side}`], heel = landmark[`heel_${side}`], toe = landmark[`toe_${side}`];
    const [a, h, t] = [points[ankle], raw[heel], raw[toe]];
    if (support.get(ankle) !== 'observed' || !inside(h) || !inside(t)
      || confidence(h) < .24 || confidence(t) < .36) continue;
    const span = distance(h, t);
    if (span < Math.max(.009, torso*.035) || span > torso*.38 || distance(a, h) > torso*.24
      || distance(a, t) > torso*.44 || h.y < a.y-torso*.07 || t.y < a.y-torso*.08) continue;
    support.set(heel, 'observed');
    support.set(toe, 'observed');
  }
  return result;
}
