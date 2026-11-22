import { describe, expect, it } from 'vitest';
import { demoPose } from '../src/features/cuerpo/anatomy';
import { averagePose, averagePreciseCapture, averagePrecisePose, captureIssue, type PoseSample } from '../src/features/cuerpo/poseCapture';

const points = demoPose.map(point => ({ ...point, z: 0 }));
points[2] = { x: .525, y: .105, z: 0, visibility: 1 };
points[5] = { x: .475, y: .105, z: 0, visibility: 1 };
points[29] = { x: .62, y: .955, z: 0, visibility: 1 };
points[30] = { x: .38, y: .955, z: 0, visibility: 1 };
points[31] = { x: .65, y: .97, z: 0, visibility: 1 };
points[32] = { x: .35, y: .97, z: 0, visibility: 1 };

function sample(time: number, offset: number): PoseSample {
  return {
    time,
    points,
    world: points.map(point => ({ ...point, x: point.x + offset, z: .05 })),
  };
}

describe('captura tridimensional de la pose', () => {
  it('promedia la última media segundo y descarta muestras viejas', () => {
    const history = [sample(200, 2), sample(600, .01), sample(700, .02), sample(800, .03), sample(900, .04), sample(1000, .05)];
    const captured = averagePose(history, 1010, .8, .8);
    expect(captured?.[11].x).toBeCloseTo(.65);
    expect(captured?.[11].z).toBeCloseTo(.05);
    expect(averagePose(history, 1400, .8, .8)).toBeNull();
  });

  it('espera varias muestras de cuerpo completo y descarta pies fuera del recorte', () => {
    const history = [sample(500, 0), sample(600, 0), sample(700, 0), sample(800, 0), sample(900, 0)];
    expect(averagePose(history.slice(-2), 910, .8, .8)).toBeNull();
    const cropped = history.map(frame => ({
      ...frame,
      points: frame.points.map((point, i) => i === 27 ? { ...point, y: 1.05 } : point),
    }));
    expect(averagePose(cropped, 910, .8, .8)).toBeNull();
  });
});

describe('captura precisa', () => {
  it('exige tobillos, talones y puntas visibles dentro del recorte actual', () => {
    expect(captureIssue(sample(1000, 0), .8, .8, 1050)).toBe('');
    for (const i of [27, 28, 29, 30, 31, 32]) {
      const frame = sample(1000, 0);
      frame.points = frame.points.map((point, index) => i === index ? { ...point, visibility: .2 } : point);
      expect(captureIssue(frame, .8, .8, 1050)).toMatch(/pies/);
    }
    const cropped = sample(1000, 0);
    cropped.points = cropped.points.map((point, i) => i === 31 ? { ...point, y: 1.04 } : point);
    expect(captureIssue(cropped, .8, .8, 1050)).toMatch(/pies/);
    expect(captureIssue(sample(1000, 0), .8, .8, 1600)).toMatch(/cuerpo completo/);
  });

  it('admite un talón con menor confianza cuando tiene apoyo de tobillo y punta', () => {
    const supported = sample(1000, 0);
    supported.points = supported.points.map((point, i) => i === 29 ? { ...point, visibility: .43 } : point);
    expect(captureIssue(supported, .8, .8)).toBe('');
    supported.points[29] = { ...supported.points[29], x: .95 };
    expect(captureIssue(supported, .8, .8)).toMatch(/pies/);
  });

  it('promedia solo los world landmarks del segundo, con muestras de principio y fin', () => {
    const history = [sample(900, .9), sample(1000, .01), sample(1400, .03), sample(1800, .05), sample(2100, .9)];
    expect(averagePrecisePose(history, 1000, .8, .8)?.[11].x).toBeCloseTo(.65);
    expect(averagePrecisePose(history.slice(0, 3), 1000, .8, .8)).toBeNull();
    expect(averagePrecisePose(history.map(frame =>
      frame.time === 1400 ? { ...frame, points: [] } : frame), 1000, .8, .8)).toBeNull();
  });

  it('acepta la captura lenta al reunir tres muestras repartidas en la duración medida', () => {
    const history = [sample(1060, .01), sample(1620, .03), sample(2180, .05)];
    expect(averagePreciseCapture(history, 1000, .8, .8)).toBeNull();
    expect(averagePreciseCapture(history, 1000, .8, .8, 1180)?.world[11].x).toBeCloseTo(.65);
  });
});
