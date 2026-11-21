import { describe, expect, it } from 'vitest';
import { demoPose } from '../src/features/cuerpo/anatomy';
import { averagePose, type PoseSample } from '../src/features/cuerpo/poseCapture';

const points = demoPose.map(point => ({ ...point, z: 0 }));
points[2] = { x: .525, y: .105, z: 0, visibility: 1 };
points[5] = { x: .475, y: .105, z: 0, visibility: 1 };

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
