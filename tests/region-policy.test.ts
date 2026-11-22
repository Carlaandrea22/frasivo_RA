import { expect, test } from 'vitest';
import { chooseRegions, confirmRegions } from '../src/features/cuerpo/regionPolicy';
import type { BodyPoint } from '../src/features/cuerpo/anatomy';
import type { FaceRegion, HandRegion } from '../src/features/cuerpo/regionalDetection';

function pose(): BodyPoint[] {
  const points = Array.from({length:33}, () => ({x: 0,y: 0,z: 0,visibility: 0}));
  for (const [i,x,y] of [[0,.5,.12],[2,.53,.11],[5,.47,.11],[7,.58,.11],[8,.42,.11],
    [11,.68,.22],[12,.32,.22],[13,.75,.35],[14,.25,.35],[15,.77,.48],[16,.23,.48],
    [23,.60,.44],[24,.40,.44],[25,.60,.66],[26,.40,.66],[27,.60,.86],[28,.40,.86],
    [29,.59,.88],[30,.39,.88],[31,.66,.92],[32,.46,.92]]) points[i]={x,y,z:0,visibility:1};
  return points;
}

test('una mano dominante descarta un torso de Pose más chico, aunque Pose confíe en sus articulaciones', () => {
  const phantom=pose().map(point=>({...point,x:.40+point.x*.20,y:.35+point.y*.40}));
  const hand: HandRegion = {
    side:'right', confidence:.98, worldLandmarks: [],
    landmarks:Array.from({length:21},(_,i)=>({x:.26+(i%5)*.12,y:.35+Math.floor(i/5)*.07})),
  };
  const result=chooseRegions(phantom,1,1,[hand],null,'front');
  expect(result.status).toBe('Mano derecha');
  expect(result.groups.size).toBe(0);
  expect(result.fullBody).toBe(false);
  expect(result.reasons).toContain('Pose no coincide con la escala de la mano');
});

test('una cara grande sin hombros válidos nunca añade torso ni extremidades', () => {
  const face: FaceRegion = { matrix:[], jawOpen:0,
    landmarks:Array.from({length:478},(_,i)=>({x:.25+(i%5)*.11,y:.22+(i%7)*.07})) };
  const result=chooseRegions([],1,1,[],face,'unknown');
  expect(result.status).toBe('Cabeza');
  expect(result.groups.size).toBe(0);
  expect(result.face).toBe(face);
});

test('los ojos y orejas de Pose aislados no habilitan el cráneo sin Face', () => {
  const result = chooseRegions(pose().slice(0, 11), 1, 1, [], null, 'front');
  expect(result.status).toBe('Buscando…');
  expect(result.groups.has('head')).toBe(false);
});

test('cuerpo completo mantiene torso y piernas, mientras un recorte conserva solo sus regiones', () => {
  const source=pose();
  const full=chooseRegions(source,1,1,[],null,'front');
  expect(full.fullBody).toBe(true);
  expect(full.groups.has('shin_left')).toBe(true);
  const partial=chooseRegions(source.slice(0,23),1,1,[],null,'front');
  expect(partial.status).toBe('Torso');
  expect(partial.groups.has('trunk')).toBe(true);
  expect(partial.groups.has('shin_left')).toBe(false);
});

test('una mano pequeña en un cuerpo de espaldas conserva la guía del atlas', () => {
  const hand: HandRegion = {
    side: 'right', confidence: .98, worldLandmarks: [],
    landmarks: Array.from({ length: 21 }, (_, i) => ({ x: .15 + (i%5)*.015, y: .42 + Math.floor(i/5)*.014 })),
  };
  const result = chooseRegions(pose(), 1, 1, [hand], null, 'back');
  expect(result.status).toBe('Buscando…');
  expect(result.hands).toHaveLength(0);
  expect(result.reasons).toContain('Pose está de espaldas');
});

test('la histéresis exige dos observaciones para adquirir y elimina regiones inválidas al desaparecer', () => {
  const absent = new Set<string>(), head = new Set(['face']), hand = new Set(['hand_left']);
  expect(confirmRegions(absent,head,absent)).toEqual(absent);
  expect(confirmRegions(head,head,absent)).toEqual(head);
  expect(confirmRegions(head,hand,head)).toEqual(absent);
});
