import { chooseSpaceMode } from '../src/features/cuerpo/spaceMode';
import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';

describe('camera overlay', () => {
  it('places the pose center at the freeze-frame position before motion is enabled', async () => {
    const { frozenPosition } = await import('../src/features/cuerpo/cameraFraming');
    const camera = new PerspectiveCamera(42, .6, .01, 60);
    const result = frozenPosition({ x: .72, y: .36, height: .7 }, new Vector3(.5, 1.7, .25), camera, 1).project(camera);
    expect((1 + result.x) / 2).toBeCloseTo(.72);
    expect((1 - result.y) / 2).toBeCloseTo(.36);
  });

  it('uses the first phone rotation as a calibration and responds to relative yaw', async () => {
    const { deviceRotation } = await import('../src/features/cuerpo/cameraFraming');
    const calibration = deviceRotation(110, 90, 0, 0);
    const unchanged = calibration.clone().invert().multiply(deviceRotation(110, 90, 0, 0));
    expect(unchanged.angleTo(new Quaternion())).toBeCloseTo(0);
    const relative = calibration.clone().invert().multiply(deviceRotation(130, 90, 0, 0));
    const direction = new Vector3(0, 0, -1).applyQuaternion(relative);
    expect(direction.x).toBeCloseTo(-Math.sin(Math.PI / 9));
    expect(direction.y).toBeCloseTo(0);
  });
});

it('creates no label decorations for missing or empty selections', async () => {
  const { Group } = await import('three');
  const { buildUsdLabels } = await import('../src/features/cuerpo/usdLabels');
  expect(buildUsdLabels(new Group(), ['femur']).children).toHaveLength(0);
  expect(buildUsdLabels(new Group(), []).children).toHaveLength(0);
});

it('elige cámara en iPhone, WebXR en Android compatible y visor como respaldo', () => {
  expect(chooseSpaceMode({ ios: true, android: false, webxr: false })).toBe('camera');
  expect(chooseSpaceMode({ ios: false, android: true, webxr: true })).toBe('webxr');
  expect(chooseSpaceMode({ ios: false, android: true, webxr: false })).toBe('viewer');
});
