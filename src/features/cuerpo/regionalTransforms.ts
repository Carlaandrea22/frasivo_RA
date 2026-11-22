import { Matrix4, Quaternion, Vector3 } from 'three';
import type { BodyPoint } from './anatomy';

export type RegionalSide = 'left' | 'right';
export type HandMuscleView = 'palmar' | 'dorsal';
export type Coordinates = readonly [number, number, number];

export interface RegionalFoot {
  side: RegionalSide;
  ankle: BodyPoint;
  heel: BodyPoint;
  toe: BodyPoint;
}

export interface RegionalNeck {
  shoulderLeft: BodyPoint;
  shoulderRight: BodyPoint;
}

export function videoPoint(point: BodyPoint, aspect: number, depthOrigin = 0) {
  return new Vector3(point.x*aspect, 1-point.y, (depthOrigin-(point.z ?? depthOrigin))*aspect);
}

function shift(point: Vector3) {
  return new Matrix4().makeTranslation(point.x, point.y, point.z);
}

interface Landmarks {
  base: Vector3;
  middle: Vector3;
  tip: Vector3;
}

export function handCrossSectionScale(source: Landmarks, target: Landmarks) {
  const lengthScale = (target.base.distanceTo(target.middle)+target.base.distanceTo(target.tip)) /
    (source.base.distanceTo(source.middle)+source.base.distanceTo(source.tip));
  const widthScale = target.middle.distanceTo(target.tip)/source.middle.distanceTo(source.tip);
  return Math.max(lengthScale*.62, Math.min(lengthScale*1.25, widthScale));
}

export function fitLandmarkPlane(source: Landmarks, target: Landmarks, mirrored: boolean) {
  const sourceU = source.middle.clone().sub(source.base), sourceV = source.tip.clone().sub(source.base);
  const targetU = target.middle.clone().sub(target.base), targetV = target.tip.clone().sub(target.base);
  const sourceNormal = sourceU.clone().cross(sourceV), targetNormal = targetU.clone().cross(targetV);
  if (sourceNormal.lengthSq() < 1e-12 || targetNormal.lengthSq() < 1e-12) return null;
  const widthScale = (targetU.length()+targetV.length())/(sourceU.length()+sourceV.length());
  return shift(target.base).multiply(new Matrix4().makeBasis(targetU, targetV,
    targetNormal.normalize().multiplyScalar(widthScale*(mirrored ? -1 : 1))))
    .multiply(new Matrix4().makeBasis(sourceU, sourceV, sourceNormal.normalize()).invert())
    .multiply(shift(source.base.clone().negate()));
}

function boneBasis(y: Vector3, preferred: Vector3, mirrored = false) {
  let z = preferred.clone().addScaledVector(y, -preferred.dot(y));
  if (z.lengthSq() < 1e-6) {
    const fallback = Math.abs(y.z) < .9 ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0);
    z = fallback.addScaledVector(y, -fallback.dot(y));
  }
  z.normalize();
  const x = y.clone().cross(z).multiplyScalar(mirrored ? -1 : 1);
  return new Matrix4().makeBasis(x, y, z);
}

export function fitRegionalSegment(
  source: readonly [Vector3, Vector3],
  target: readonly [Vector3, Vector3],
  sourceNormal: Vector3,
  targetNormal: Vector3,
  widthScale: number,
  mirrored = false,
) {
  const sourceAxis = source[1].clone().sub(source[0]), targetAxis = target[1].clone().sub(target[0]);
  if (sourceAxis.lengthSq() < 1e-9 || targetAxis.lengthSq() < 1e-8) return null;
  const lengthScale = targetAxis.length()/sourceAxis.length();
  return shift(target[0]).multiply(boneBasis(targetAxis.normalize(), targetNormal, mirrored))
    .scale(new Vector3(widthScale, lengthScale, widthScale))
    .multiply(boneBasis(sourceAxis.normalize(), sourceNormal).invert())
    .multiply(shift(source[0].clone().negate()));
}

export function handMuscleView(normal: Vector3, previous?: HandMuscleView): HandMuscleView {
  return previous && Math.abs(normal.z) < .20 ? previous : normal.z >= 0 ? 'palmar' : 'dorsal';
}

export function visibleNeckFit(
  source: readonly [Vector3, Vector3],
  top: Vector3,
  shoulders: Vector3,
  rotation: Quaternion,
  scale: number,
  maxDistance = .21,
) {
  if (shoulders.y >= top.y || top.distanceTo(shoulders) >= maxDistance) return null;
  const forward = new Vector3(0, 0, 1);
  return fitRegionalSegment(source, [top, shoulders], forward, forward.clone().applyQuaternion(rotation), scale);
}

export function faceRotation(matrix: readonly number[]) {
  if (matrix.length !== 16 || !matrix.every(Number.isFinite)) return null;
  // The worker converts MediaPipe's column-major payload to row-major.
  const flat = matrix as [number, number, number, number, number, number, number, number,
    number, number, number, number, number, number, number, number];
  const rotation = new Matrix4().extractRotation(new Matrix4().set(...flat));
  const quaternion = new Quaternion().setFromRotationMatrix(rotation);
  return Number.isFinite(quaternion.lengthSq()) && quaternion.lengthSq() > .5 ? quaternion.normalize() : null;
}

export function fitHeadProjection(
  source: readonly Vector3[],
  target: readonly Vector3[],
  rotation: Quaternion,
  weights: readonly number[],
) {
  const count = weights.reduce((sum, weight) => sum+weight, 0);
  const rotated = source.map(point => point.clone().applyQuaternion(rotation));
  const midpoint = (points: readonly Vector3[]) => points.reduce((sum, point, i) =>
    sum.addScaledVector(point, weights[i]), new Vector3()).divideScalar(count);
  const from = midpoint(rotated), to = midpoint(target);
  let covariance = 0, spread = 0;
  for (let i = 0; i < weights.length; i++) {
    const x = rotated[i].x-from.x, y = rotated[i].y-from.y;
    covariance += weights[i]*(x*(target[i].x-to.x)+y*(target[i].y-to.y));
    spread += weights[i]*(x*x+y*y);
  }
  const scale = covariance/spread;
  if (!(scale > 0 && scale < 45)) return null;
  return new Matrix4().compose(to.addScaledVector(from, -scale), rotation, new Vector3().setScalar(scale));
}
