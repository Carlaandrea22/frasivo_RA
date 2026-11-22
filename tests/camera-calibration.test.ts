import { describe, expect, it } from 'vitest';
import { Euler, PerspectiveCamera, Vector3 } from 'three';
import { calibrateCamera, projectCalibrationPoint, projectedImagePoint, type CalibrationPoint } from '../src/features/cuerpo/cameraCalibration';

const width = 375, height = 643;
const joints = [
  [-.19, 1.39, .025], [.21, 1.42, -.06],
  [-.15, .92, -.035], [.12, .88, .07],
  [-.21, .53, .14], [.16, .49, -.09],
  [-.24, .10, .015], [.22, .12, -.12],
  [-.055, 1.67, .16], [.055, 1.69, .14],
] as const;

describe('calibración del esqueleto sobre la cámara', () => {
  it('recupera una cámara en perspectiva con inclinación, distancia y campo de visión', () => {
    const expected = new PerspectiveCamera(35, width / height, .03, 40);
    expected.position.set(.45, 1.24, 3.02);
    expected.quaternion.setFromEuler(new Euler(-.12, .15, .035));
    expected.updateMatrixWorld(true);
    const correspondences = joints.map(position => {
      const p = new Vector3(...position).project(expected);
      return { position, x: (p.x + 1) / 2, y: (1 - p.y) / 2 };
    });

    const result = calibrateCamera(correspondences, width, height);
    expect(result).not.toBeNull();
    expect(result!.maxErrorPx).toBeLessThan(2);
    expect(result!.fov).toBeCloseTo(35, 0);
    const actual = projectCalibrationPoint(joints[0], result!, width, height);
    expect(actual!.x).toBeCloseTo(correspondences[0].x, 2);
    expect(actual!.y).toBeCloseTo(correspondences[0].y, 2);
  });

  it('usa el centro recortado que corresponde a object-fit: cover', () => {
    expect(projectedImagePoint({ x: .25, y: .3 }, 1, .5)).toEqual({ x: 0, y: .3 });
    expect(projectedImagePoint({ x: .4, y: .25 }, .5, 1)).toEqual({ x: .4, y: 0 });
  });

  it('mantiene el error de la foto de prueba por debajo de 15 px a 375 px', () => {
    // Promedio de Pose Full sobre tests/fixtures/pose-front.jpg en el encuadre de Playwright.
    // Cada fila contiene la posición mundial (metros, eje Y hacia arriba) y la posición en el vídeo.
    const measured = [
      [.01743, .65841, .24360, .52873, .16546], [-.01002, .65101, .25658, .48636, .16490],
      [.11213, .46114, .03401, .60563, .27410], [-.18068, .43845, .16642, .34975, .26876],
      [.09979, .00710, -.05168, .57281, .47832], [-.10005, -.00653, .05024, .43447, .48261],
      [.13111, -.40608, -.04842, .63412, .64365], [-.03627, -.40765, .05031, .45997, .65693],
      [.15273, -.77275, -.13137, .62043, .79895], [-.00470, -.77172, -.03228, .47627, .81329],
    ] as const;
    const measuredHeight = 690.609375;
    const points: CalibrationPoint[] = measured.map(([x, y, z, u, v], index) => ({
      position: [x, y, z],
      ...projectedImagePoint({ x: u, y: v }, 560 / 1040, width / measuredHeight),
      weight: index < 2 ? .3 : 1,
    }));
    const fit = calibrateCamera(points, width, measuredHeight);
    expect(fit?.maxErrorPx).toBeLessThan(15);
  });

  it('rechaza un encuadre degenerado', () => {
    const bad: CalibrationPoint[] = joints.map(position => ({ position, x: .4, y: .6 }));
    expect(calibrateCamera(bad, width, height)).toBeNull();
    expect(calibrateCamera(bad.slice(0, 3), width, height)).toBeNull();
  });
});
