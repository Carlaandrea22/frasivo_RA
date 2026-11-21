import type { BodyPoint } from './anatomy';
import { landmark, pointInFrame, visibleRegion } from './atlasAlignment';

export interface PoseSample {
  time: number;
  points: BodyPoint[];
  world: BodyPoint[];
}

export const captureWindow = 520;

const torso = [landmark.shoulder_left, landmark.shoulder_right, landmark.hip_left, landmark.hip_right];
const legs = [landmark.knee_left, landmark.knee_right, landmark.ankle_left, landmark.ankle_right];
const arms = [landmark.elbow_left, landmark.elbow_right, landmark.wrist_left, landmark.wrist_right];

function validWorld(point: BodyPoint | undefined) {
  return point && Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z);
}

export function captureIssue(sample: PoseSample | undefined, aspect: number, viewportAspect: number) {
  if (!sample) return 'Encuadra a una persona de cuerpo completo';
  const region = visibleRegion(aspect, viewportAspect);
  const seen = (index: number, confidence = .65) =>
    pointInFrame(sample.points[index], aspect, region, confidence) && validWorld(sample.world[index]);
  if (!torso.every(index => seen(index))) return 'Aléjate para ver el cuerpo completo';
  if (!legs.every(index => seen(index))) return 'Aléjate para ver los pies';
  if (!arms.every(index => seen(index, .52))) return 'Muestra los brazos y las muñecas';
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
  const region = visibleRegion(aspect, viewportAspect);
  return Array.from({ length: 33 }, (_, index) => {
    const sum = { x: 0, y: 0, z: 0, visibility: 0 };
    let count = 0;
    for (const frame of frames) {
      const point = frame.world[index];
      const confidence = frame.points[index]?.visibility ?? 0;
      if (!validWorld(point) || !pointInFrame(frame.points[index], aspect, region, .40)) continue;
      sum.x += point.x;
      sum.y += point.y;
      sum.z += point.z!;
      sum.visibility += confidence;
      count++;
    }
    if (count < Math.ceil(frames.length / 2)) return { x: 0, y: 0, z: 0, visibility: 0 };
    return { x: sum.x/count, y: sum.y/count, z: sum.z/count, visibility: sum.visibility/count };
  });
}
