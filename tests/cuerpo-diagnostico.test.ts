import { expect, test } from 'vitest';
import { createBodyDiagnostic } from '../src/features/cuerpo/bodyDiagnostic';
import { execFileSync } from 'node:child_process';

const lite = { model: 'lite', delegate: 'CPU' } as const;
const full = { model: 'full', delegate: 'CPU' } as const;

test('conserva 15 segundos de observaciones, incluso cuando Pose devuelve cero puntos', () => {
  const record = createBodyDiagnostic(time => ({
    layer: 'bones',
    bones: time === 5 ? ['skull'] : [],
    discards: [['tibia_left', 'regiones', 'fuera de cuadro']],
    region: time === 5 ? 'Torso' : 'Buscando…',
  }));
  record.reset(0);
  record.engine(0, lite, 'cpu-solicitada');
  record.frame(1, 0, lite, []);
  const raw = [{ x: .1, y: .2, z: .3, visibility: .87654, world: [1,2,3] }];
  record.frame(5, 10_000, lite, raw);
  record.engine(19_950, full, 'full-activo');
  record.frame(7, 20_000, full, []);
  const report = record.read();
  expect(report.poseFps).toBe(.1);
  expect(report.frames.map(frame => frame.timeMs)).toEqual([10_000, 20_000]);
  expect(report.frames[0]).toEqual({
    timeMs: 10_000, ...lite, visibility: [.8765, ...Array(32).fill(null)], bones: ['skull'],
    discards: [['tibia_left', 'regiones', 'fuera de cuadro']], region: 'Torso', layer: 'bones',
  });
  expect(report.frames[1].visibility).toEqual(Array(33).fill(null));
  expect(report.engine).toEqual(full);
  expect(report.engineChanges.map(event => event.reason)).toEqual(['cpu-solicitada', 'full-activo']);
});

test('el resumen reconoce pies regionales y ordena ausencias y motivos reales', () => {
  const both = (bone: string) => [`${bone}_left`, `${bone}_right`];
  const bones = ['skull', 'spine', 'ribs_left', 'ribs_right', 'pelvis_left', 'pelvis_right',
    ...['humerus','radius','ulna','femur','tibia','fibula'].flatMap(both),
    'foot_left:calcaneus', 'foot_right:calcaneus'];
  const partial = bones.filter(bone => bone !== 'tibia_left' && bone !== 'fibula_left');
  const input = { schemaVersion: 1, frames: [
    { bones, discards: [], region: 'Cuerpo completo', layer: 'bones' },
    { bones: partial, discards: [['tibia_left','regiones','visibilidad'], ['fibula_left','regiones','visibilidad']],
      region: 'Torso', layer: 'bones' },
  ] };
  const result = execFileSync(process.execPath, ['--input-type=module', '-e', `
    import { readFileSync } from 'node:fs';
    import { summarizeDiagnostic } from './tests/cuerpo-diagnostico-analizar.mjs';
    console.log(JSON.stringify(summarizeDiagnostic(JSON.parse(readFileSync(0, 'utf8')))));
  `], { input: JSON.stringify(input), encoding: 'utf8' });
  const report = JSON.parse(result);
  expect(report.completePercentage).toBe(50);
  expect(report.missingBones).toEqual([['fibula_left', 1], ['tibia_left', 1]]);
  expect(report.discardReasons).toEqual([['regiones · visibilidad', 2]]);
});
