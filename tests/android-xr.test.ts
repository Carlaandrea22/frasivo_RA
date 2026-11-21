import { describe, expect, it } from 'vitest';
import { Matrix4, Vector3 } from 'three';
import { floorHit, facingYaw, requestAndroidAR } from '../src/features/cuerpo/androidXR';

describe('Android WebXR', () => {
  it('releases the camera and requests the required features within the initiating call', async () => {
    const overlay = {} as HTMLElement;
    const session = {} as XRSession;
    let cameraReleased = false;
    const requests: XRSessionInit[] = [];
    const pending = requestAndroidAR({
      requestSession(mode, settings) {
        expect(cameraReleased).toBe(true);
        expect(mode).toBe('immersive-ar');
        requests.push(settings!);
        return Promise.resolve(session);
      },
    }, overlay, () => { cameraReleased = true; });
    expect(requests).toEqual([{
      requiredFeatures: ['hit-test', 'anchors', 'dom-overlay'],
      optionalFeatures: ['local-floor'],
      domOverlay: { root: overlay },
    }]);
    await expect(pending).resolves.toBe(session);
  });

  it('accepts the horizontal floor and skips walls, ceilings and tabletops', () => {
    const flat = new Matrix4().elements;
    const wall = new Matrix4().makeRotationX(Math.PI / 2).elements;
    const ceiling = new Matrix4().makeRotationX(Math.PI).elements;
    expect(floorHit(flat, -1.3, 0, .05)).toBe(true);
    expect(floorHit(flat, -1.3, 0)).toBe(true);
    expect(floorHit(flat, -.4, 0)).toBe(false);
    expect(floorHit(flat, -.8, 0, .6)).toBe(false);
    expect(floorHit(wall, -1.3, 0, .05)).toBe(false);
    expect(floorHit(ceiling, -1.3, 0, .05)).toBe(false);
  });

  it('points model front toward the starting viewer without pitching it', () => {
    const floor = new Vector3(1, -1.4, -3);
    expect(facingYaw(floor, new Vector3(5, 0, -3))).toBeCloseTo(Math.PI / 2);
    expect(facingYaw(floor, new Vector3(1, 1, -8))).toBeCloseTo(Math.PI);
    expect(facingYaw(floor, new Vector3(1, 1, -3), -.4)).toBeCloseTo(-.4);
  });
});
