import type { Group } from 'three';
import { landmark } from './atlasAlignment';
import { calibrateCamera, projectedImagePoint, type CalibrationPoint } from './cameraCalibration';
import type { PrecisePose } from './poseCapture';

type Position = [number, number, number];
interface RigJoints {
  measured: Position[];
  face: 'eye' | 'ear';
  head: Position;
}

const tracked = [
  landmark.shoulder_left, landmark.shoulder_right,
  landmark.hip_left, landmark.hip_right,
  landmark.knee_left, landmark.knee_right,
  landmark.ankle_left, landmark.ankle_right,
];

export function fitPoseProjection(model: Group, pose: PrecisePose, width: number, height: number) {
  const rig = model.userData.calibrationJoints as RigJoints | undefined;
  if (!rig) return null;
  const viewport = width / height;
  const points: CalibrationPoint[] = tracked.flatMap(index => {
    const image = pose.image[index];
    if ((image?.visibility ?? 0) < .45) return [];
    return [{ position: rig.measured[index], ...projectedImagePoint(image, pose.aspect, viewport) }];
  });
  const left = pose.image[landmark[`${rig.face}_left`]], right = pose.image[landmark[`${rig.face}_right`]];
  if (left && right && Math.min(left.visibility ?? 0, right.visibility ?? 0) >= .45) {
    points.push({ position: rig.head, ...projectedImagePoint(
      { x: (left.x+right.x)/2, y: (left.y+right.y)/2 }, pose.aspect, viewport),
    });
  }
  const fit = calibrateCamera(points, width, height);
  return fit ? { fit, points } : null;
}
