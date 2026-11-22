import { expect, test } from 'vitest';
import { atlasPlacement, landmark } from '../src/features/cuerpo/atlasAlignment';
import type { BodyPoint } from '../src/features/cuerpo/anatomy';
import { stabilizeLivePose, type LivePose } from '../src/features/cuerpo/livePose';
import { chooseRegions } from '../src/features/cuerpo/regionPolicy';

function standing() {
  const points: BodyPoint[] = Array.from({ length: 33 }, () => ({ x: .5, y: .2, z: 0, visibility: 0 }));
  for (const [i, x, y] of [[0,.5,.14],[2,.53,.13],[5,.47,.13],[7,.57,.14],[8,.43,.14],
    [11,.65,.25],[12,.35,.25],[13,.70,.38],[14,.30,.38],[15,.72,.49],[16,.28,.49],
    [23,.58,.46],[24,.42,.46],[25,.59,.65],[26,.41,.65],[27,.60,.84],[28,.40,.84],
    [29,.59,.85],[30,.41,.85],[31,.64,.88],[32,.36,.88]]) {
    points[i] = { x, y, z: 0, visibility: .98 };
  }
  return points;
}
const update = (points: BodyPoint[], time = 0, previous?: LivePose, viewportAspect = .65) =>
  stabilizeLivePose(points, time, .65, viewportAspect, previous);

test.each([
  ['knee_left', 'thigh_left', 'shin_left', .65],
  ['elbow_left', 'upper_arm_left', 'forearm_left', .38],
] as const)('recupera %s entre dos extremos fiables y lo proyecta en ambos segmentos', (joint, upper, lower, y) => {
  const points = standing();
  const previous = update(points);
  points[landmark[joint]] = { x: .94, y, z: 0, visibility: .06 };
  const pose = update(points, 100, previous);
  expect(pose.support.get(landmark[joint])).toBe('inferred');
  expect(pose.points[landmark[joint]].x).toBeCloseTo(previous.points[landmark[joint]].x, 1);
  const atlas = atlasPlacement(pose.points, .65, .65, true, true, pose.support);
  expect(atlas.matrices[upper]).not.toBeNull();
  expect(atlas.matrices[lower]).not.toBeNull();
  const regions = chooseRegions(pose.points, .65, .65, [], null, 'front', new Set(), 'bones', pose.support);
  expect(regions.groups.has(upper)).toBe(true);
  expect(regions.groups.has(lower)).toBe(true);
});

test('adquiere una pierna de baja visibilidad con un torso fiable y dos tramos plausibles', () => {
  const points = standing();
  for (const i of [25,26,27,28,31,32]) points[i].visibility = .43;
  for (const i of [29,30]) points[i].visibility = .28;
  const pose = update(points);
  const regions = chooseRegions(pose.points, .65, .65, [], null, 'front', new Set(), 'bones', pose.support);
  expect(regions.fullBody).toBe(true);
  expect(regions.feet).toHaveLength(2);
  expect(pose.points[27].visibility).toBe(.43);
  points[27].x = .96;
  points[27].y = .63;
  expect(update(points).support.has(27)).toBe(false);
});

test('la histéresis exige confianza para adquirir, admite bajadas breves y vence a los 400 ms', () => {
  const points = standing();
  const reliable = update(points);
  points[27].visibility = .32;
  expect(update(points).support.has(27)).toBe(false);
  const held = update(points, 120, reliable);
  expect(held.support.has(27)).toBe(true);
  points[27].visibility = .14;
  const inferred = update(points, 220, held);
  expect(inferred.support.get(27)).toBe('inferred');
  expect(update(points, 521, inferred).support.has(27)).toBe(false);
});

test('un extremo que sale del encuadre cancela la inferencia de inmediato', () => {
  const points = standing();
  const previous = update(points);
  points[27] = { x: .6, y: .99, z: 0, visibility: .2 };
  const cropped = update(points, 100, previous, .85);
  expect(cropped.support.has(27)).toBe(false);
  expect(cropped.framing).toBe('legs');
});

test('una pose ausente borra inmediatamente la geometría del cuadro anterior', () => {
  const previous = update(standing());
  const missing = update([], 100, previous);
  expect(missing.points).toEqual([]);
  expect(missing.support.size).toBe(0);
});

test('deduce una rodilla ausente en una pierna extendida con extremos fiables y sin historial', () => {
  const points = standing();
  points[25] = { x: NaN, y: NaN, visibility: 0 };
  const pose = update(points);
  expect(pose.support.get(25)).toBe('inferred');
  expect(pose.points[25].y).toBeCloseTo(.67, 2);
});
