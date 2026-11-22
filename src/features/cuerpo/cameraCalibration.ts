import { Euler, MathUtils, Quaternion, Vector3 } from 'three';

export interface CalibrationPoint {
  position: readonly [number, number, number];
  /** Fraction of the displayed camera viewport, including its center crop. */
  x: number;
  y: number;
  weight?: number;
}

export interface CameraCalibration {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  fov: number;
  errorPx: number;
  maxErrorPx: number;
}

export function projectedImagePoint(point: { x: number; y: number }, imageAspect: number, viewportAspect: number) {
  const visibleWidth = Math.min(1, viewportAspect / imageAspect);
  const visibleHeight = Math.min(1, imageAspect / viewportAspect);
  return {
    x: (point.x - (1 - visibleWidth) / 2) / visibleWidth,
    y: (point.y - (1 - visibleHeight) / 2) / visibleHeight,
  };
}

export function projectCalibrationPoint(position: CalibrationPoint['position'], calibration: CameraCalibration, width: number, height: number) {
  const local = new Vector3(...position).sub(new Vector3(...calibration.position))
    .applyQuaternion(new Quaternion(...calibration.quaternion).invert());
  const depth = -local.z;
  if (depth <= .03) return null;
  const focal = height / (2 * Math.tan(MathUtils.degToRad(calibration.fov) / 2));
  return { x: .5 + (local.x * focal / depth) / width, y: .5 - (local.y * focal / depth) / height, depth };
}

function solveSystem(matrix: number[][], values: number[]) {
  const n = values.length;
  const rows = matrix.map((row, i) => [...row, values[i]]);
  for (let column = 0; column < n; column++) {
    let pivot = column;
    for (let row = column + 1; row < n; row++) {
      if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
    }
    if (Math.abs(rows[pivot][column]) < 1e-10) return null;
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];
    const divisor = rows[column][column];
    for (let j = column; j <= n; j++) rows[column][j] /= divisor;
    for (let row = 0; row < n; row++) {
      if (row === column) continue;
      const factor = rows[row][column];
      for (let j = column; j <= n; j++) rows[row][j] -= factor * rows[column][j];
    }
  }
  return rows.map(row => row[n]);
}

function vectorMean(points: Vector3[]) {
  return points.reduce((sum, point) => sum.add(point), new Vector3()).divideScalar(points.length);
}

/** Fits a calibrated pinhole view to 2D/3D landmark correspondences.
 * Translation is expressed relative to the joints' centroid in camera coordinates.
 * Weak focal regularization keeps the solution stable when joints are nearly coplanar.
 */
export function calibrateCamera(
  points: readonly CalibrationPoint[],
  width: number,
  height: number,
  priorFov = 48,
): CameraCalibration | null {
  const samples = points.filter(point => [point.x, point.y, ...point.position].every(Number.isFinite)
    && Number.isFinite(point.weight ?? 1) && (point.weight ?? 1) > 0);
  if (samples.length < 6 || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const modelPoints = samples.map(point => new Vector3(...point.position));
  const center = vectorMean(modelPoints);
  const centered = modelPoints.map(point => point.sub(center));
  const image = samples.map(point => ({ x: (point.x - .5) * width, y: (.5 - point.y) * height, weight: Math.sqrt(point.weight ?? 1) }));
  const span = (values: number[]) => Math.max(...values) - Math.min(...values);
  const spanY = span(image.map(point => point.y));
  const spanWorldY = span(centered.map(point => point.y));
  if (spanY < 8 || spanWorldY < .025 || span(image.map(point => point.x)) < 4) return null;

  const focalFactor = (fov: number) => 1 / (2 * Math.tan(MathUtils.degToRad(fov) / 2));
  const nominal = focalFactor(MathUtils.clamp(priorFov, 24, 90));
  const minFocal = Math.log(focalFactor(100)), maxFocal = Math.log(focalFactor(20));
  const focus = Math.log(nominal);
  const depth = Math.max(.15, nominal * height * spanWorldY / spanY);
  const avgX = image.reduce((sum, point) => sum + point.x, 0) / image.length;
  const avgY = image.reduce((sum, point) => sum + point.y, 0) / image.length;
  let parameters = [avgX * depth / (nominal * height), avgY * depth / (nominal * height), Math.log(depth), 0, 0, 0, focus];
  const inverse = new Quaternion(), local = new Vector3(), euler = new Euler();
  function residual(at: number[]) {
    const [x, y, logDepth, pitch, yaw, roll, logFocal] = at;
    const z = -Math.exp(logDepth), focal = height * Math.exp(logFocal);
    inverse.setFromEuler(euler.set(pitch, yaw, roll)).invert();
    const errors: number[] = [];
    for (let i = 0; i < centered.length; i++) {
      local.copy(centered[i]).applyQuaternion(inverse);
      const distance = -(local.z + z);
      if (distance <= .05) return null;
      const target = image[i];
      errors.push(((local.x + x) * focal / distance - target.x) * target.weight,
        ((local.y + y) * focal / distance - target.y) * target.weight);
    }
    errors.push(1.5 * (logFocal - focus), .5 * pitch, .5 * yaw, .25 * roll);
    return errors;
  }

  let errors = residual(parameters);
  if (!errors) return null;
  const squared = (values: number[]) => values.reduce((sum, v) => sum + v * v, 0);
  let cost = squared(errors), damping = .005;

  // A small Levenberg–Marquardt solve jointly adjusts the six camera pose
  // parameters and the vertical focal length. The viewport center is fixed.
  for (let attempt = 0; attempt < 60; attempt++) {
    const step = 1e-5;
    const jacobian = parameters.map((_, j) => {
      const shifted = [...parameters];
      shifted[j] += step;
      const next = residual(shifted);
      return errors!.map((value, i) => next ? (next[i] - value) / step : 0);
    });
    const dot = (left: number[], right: number[]) => left.reduce((sum, v, i) => sum + v * right[i], 0);
    const lhs = jacobian.map((column, j) => jacobian.map((other, k) => {
      const term = dot(column, other);
      return j === k ? term + damping * Math.max(term, 1) : term;
    }));
    const rhs = jacobian.map(column => -dot(column, errors!));
    const delta = solveSystem(lhs, rhs);
    if (!delta) break;
    const proposal = parameters.map((value, i) => value + delta[i]);
    proposal[6] = MathUtils.clamp(proposal[6], minFocal, maxFocal);
    const next = residual(proposal);
    const nextCost = next ? squared(next) : Infinity;
    if (next && nextCost < cost) {
      parameters = proposal;
      errors = next;
      damping = Math.max(damping * .3, 1e-8);
      if (cost - nextCost < .0001) break;
      cost = nextCost;
    } else {
      damping *= 8;
      if (damping > 1e6) break;
    }
  }

  const [x, y, logDepth, pitch, yaw, roll, logFocal] = parameters;
  const quaternion = new Quaternion().setFromEuler(new Euler(pitch, yaw, roll));
  const position = center.sub(new Vector3(x, y, -Math.exp(logDepth)).applyQuaternion(quaternion));
  const calibration: CameraCalibration = {
    position: position.toArray(),
    quaternion: quaternion.toArray(),
    fov: MathUtils.radToDeg(2 * Math.atan(.5 / Math.exp(logFocal))),
    errorPx: 0,
    maxErrorPx: 0,
  };
  const distances = samples.map(point => {
    const projected = projectCalibrationPoint(point.position, calibration, width, height);
    return projected ? Math.hypot((point.x - projected.x) * width, (point.y - projected.y) * height) : Infinity;
  });
  if (!distances.every(Number.isFinite)) return null;
  calibration.errorPx = Math.sqrt(squared(distances) / distances.length);
  calibration.maxErrorPx = Math.max(...distances);
  return calibration;
}
