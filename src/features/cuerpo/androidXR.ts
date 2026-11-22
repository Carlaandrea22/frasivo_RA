import type { Vector3 } from 'three';

export function requestAndroidAR(
  xr: Pick<XRSystem, 'requestSession'>,
  overlay: HTMLElement,
  releaseCamera: () => void,
) {
  releaseCamera();
  return xr.requestSession('immersive-ar', {
    requiredFeatures: ['hit-test', 'dom-overlay'],
    optionalFeatures: ['local-floor', 'anchors'],
    domOverlay: { root: overlay },
  });
}

export function requestPlacementAnchor(
  session: Pick<XRSession, 'enabledFeatures'>,
  frame: Pick<XRFrame, 'createAnchor'>,
  hit: Pick<XRHitTestResult, 'createAnchor'>,
  transform: XRRigidTransform,
  space: XRSpace,
) {
  if (session.enabledFeatures && !session.enabledFeatures.includes('anchors')) return;

  try {
    // The hit and frame can only create the anchor during the frame callback.
    return (hit.createAnchor?.() ?? frame.createAnchor?.(transform, space))?.catch(() => undefined);
  } catch {
    return undefined;
  }
}

export function floorHit(matrix: ArrayLike<number>, y: number, viewerY: number, floorY?: number) {
  // A hit pose's local +Y is the surface normal. Reject walls, ceilings and tilted planes.
  if (matrix[5] < Math.cos(Math.PI / 9)) return false;
  // local-floor may use an estimated standing height. Allow for the height at which the phone is held.
  return floorY === undefined ? viewerY - y >= .7 : floorY <= .45 && viewerY - y >= .45;
}

export function facingYaw(point: Vector3, viewer: Vector3, fallback = 0) {
  const dx = viewer.x - point.x, dz = viewer.z - point.z;
  return Math.hypot(dx, dz) > .05 ? Math.atan2(dx, dz) : fallback;
}
