import { Euler, MathUtils, PerspectiveCamera, Quaternion, Vector3 } from 'three';

export interface CameraFraming {
  x: number;
  y: number;
  height: number;
}

const deviceToCamera = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
const screenAxis = new Vector3(0, 0, 1);

export function deviceRotation(alpha: number, beta: number, gamma: number, screenAngle: number) {
  const radians = MathUtils.degToRad;
  return new Quaternion().setFromEuler(new Euler(radians(beta), radians(alpha), -radians(gamma), 'YXZ'))
    .multiply(deviceToCamera)
    .multiply(new Quaternion().setFromAxisAngle(screenAxis, -radians(screenAngle)));
}

export function frozenPosition(framing: CameraFraming, size: Vector3, camera: PerspectiveCamera, zoom: number) {
  const tangent = Math.tan(MathUtils.degToRad(camera.fov) / 2);
  const height = MathUtils.clamp(framing.height, .05, 1);
  const distance = Math.max(size.z / 2 + .12, size.y / (2 * height * tangent * zoom));
  return new Vector3(
    (2 * framing.x - 1) * tangent * distance * camera.aspect,
    (1 - 2 * framing.y) * tangent * distance,
    -distance,
  );
}
