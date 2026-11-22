import type { BodyPoint } from './anatomy';
import { landmark, pointInFrame, sides, visibleRegion } from './atlasAlignment';

export interface PoseSample {
  time: number;
  points: BodyPoint[];
  world: BodyPoint[];
}

export interface PrecisePose {
  world: BodyPoint[];
  image: BodyPoint[];
  aspect: number;
}

export const captureWindow = 520;
export const preciseCaptureDuration = 1000;
export const preciseCaptureEdgeTolerance = 350;

const torso = [landmark.shoulder_left, landmark.shoulder_right, landmark.hip_left, landmark.hip_right];
const knees = [landmark.knee_left, landmark.knee_right];
const head = [0, landmark.eye_left, landmark.eye_right, landmark.ear_left, landmark.ear_right];
const arms = [landmark.elbow_left, landmark.elbow_right, landmark.wrist_left, landmark.wrist_right];

function validWorld(point: BodyPoint | undefined) {
  return point && Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z);
}

export function captureIssue(sample: PoseSample | undefined, aspect: number, viewportAspect: number, now?: number) {
  if (!sample || (now !== undefined && now - sample.time > 300)) return 'Encuadra a una persona de cuerpo completo';
  const region = visibleRegion(aspect, viewportAspect);
  const locate = (index: number, confidence = .65) => validWorld(sample.world[index])
    ? pointInFrame(sample.points[index], aspect, region, confidence) : null;
  const [leftShoulder, rightShoulder, leftHip, rightHip] = torso.map(index => locate(index));
  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return 'Aléjate para ver el cuerpo completo';
  if (!head.some(index => locate(index, .52))) return 'Encuadra también la cabeza';
  if (!knees.every(index => locate(index, .52))) return 'Aléjate para ver las piernas completas';

  const trunkLength = Math.hypot(
    leftShoulder[0] + rightShoulder[0] - leftHip[0] - rightHip[0],
    leftShoulder[1] + rightShoulder[1] - leftHip[1] - rightHip[1],
  ) / 2;
  const feetVisible = sides.every(side => {
    const ankle = locate(landmark[`ankle_${side}`], .52), toe = locate(landmark[`toe_${side}`], .52);
    const heel = locate(landmark[`heel_${side}`], .40);
    if (!ankle || !heel || !toe) return false;
    // A heel viewed from the front has lower confidence. Require it to agree with both ends of the foot.
    const span = Math.hypot(heel[0] - toe[0], heel[1] - toe[1]);
    const fromAnkle = Math.hypot(heel[0] - ankle[0], heel[1] - ankle[1]);
    return span >= trunkLength*.025 && span <= trunkLength*.65 && fromAnkle <= trunkLength*.35;
  });
  if (!feetVisible) return 'Aléjate para ver los pies completos, incluidos talones y puntas';
  if (!arms.every(index => locate(index, .52))) return 'Muestra los brazos y las muñecas';
  return '';
}

export function averagePose(history: PoseSample[], now: number, aspect: number, viewportAspect: number): BodyPoint[] | null {
  const latest = history.at(-1);
  if (!latest || now - latest.time > 300) return null;
  const frames: PoseSample[] = [];
  for (let i = history.length - 1; i >= 0; i--) {
    const sample = history[i];
    if (latest.time - sample.time > captureWindow || captureIssue(sample, aspect, viewportAspect)) break;
    frames.push(sample);
  }
  if (frames.length < 3 || latest.time - frames[frames.length - 1].time < 310) return null;
  return averageWorldLandmarks(frames, aspect, viewportAspect);
}

export function averagePrecisePose(history: PoseSample[], start: number, aspect: number, viewportAspect: number) {
  return averagePreciseCapture(history, start, aspect, viewportAspect)?.world ?? null;
}

export function averagePreciseCapture(
  history: PoseSample[], start: number, aspect: number, viewportAspect: number, duration = preciseCaptureDuration,
): PrecisePose | null {
  const end = start + duration;
  const frames = history.filter(frame => frame.time >= start && frame.time <= end);
  if (frames.length < 3 || frames[0].time > start + preciseCaptureEdgeTolerance ||
    frames.at(-1)!.time < end - preciseCaptureEdgeTolerance) return null;
  if (frames.some(frame => captureIssue(frame, aspect, viewportAspect))) return null;
  return {
    world: averageWorldLandmarks(frames, aspect, viewportAspect),
    image: averageWorldLandmarks(frames, aspect, viewportAspect, true),
    aspect,
  };
}

function averageWorldLandmarks(frames: PoseSample[], aspect: number, viewportAspect: number, image = false) {
  const region = visibleRegion(aspect, viewportAspect);
  return Array.from({ length: 33 }, (_, index) => {
    const sum = { x: 0, y: 0, z: 0, visibility: 0 };
    let count = 0;
    for (const frame of frames) {
      const world = frame.world[index];
      const confidence = frame.points[index]?.visibility ?? 0;
      if (!validWorld(world) || !pointInFrame(frame.points[index], aspect, region, .40)) continue;
      const point = image ? frame.points[index] : world;
      sum.x += point.x;
      sum.y += point.y;
      sum.z += point.z ?? 0;
      sum.visibility += confidence;
      count++;
    }
    if (count < Math.ceil(frames.length / 2)) return { x: 0, y: 0, z: 0, visibility: 0 };
    return { x: sum.x/count, y: sum.y/count, z: sum.z/count, visibility: sum.visibility/count };
  });
}
