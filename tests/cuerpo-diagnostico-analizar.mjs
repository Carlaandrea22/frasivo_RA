import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const sides = ['left', 'right'];
const required = ['skull', 'spine', ...['ribs', 'pelvis', 'humerus', 'radius', 'ulna', 'femur', 'tibia', 'fibula',
  'foot_phalanges'].flatMap(bone => sides.map(side => `${bone}_${side}`))];

function ranked(counts) {
  return [...counts].sort(([boneA, countA], [boneB, countB]) => countB-countA || boneA.localeCompare(boneB));
}

function increment(counts, key) {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

export function summarizeDiagnostic(report) {
  if (report?.schemaVersion !== 1 || !Array.isArray(report.frames)) throw new Error('Formato de diagnóstico no compatible.');
  const missing = new Map();
  const reasons = new Map();
  let completeFrames = 0, analyzedFrames = 0;
  for (const frame of report.frames) {
    if (!frame || !Array.isArray(frame.bones) || !Array.isArray(frame.discards)
      || frame.bones.some(bone => typeof bone !== 'string')
      || frame.discards.some(discard => !Array.isArray(discard) || discard.length !== 3 || discard.some(value => typeof value !== 'string'))) {
      throw new Error('El diagnóstico contiene un cuadro inválido.');
    }
    if (frame.layer !== 'bones' && frame.layer !== null) continue;
    analyzedFrames++;
    const bones = new Set(frame.bones);
    for (const side of sides) {
      if (frame.bones.some(bone => bone.startsWith(`foot_${side}:`))) bones.add(`foot_phalanges_${side}`);
    }
    const absent = required.filter(bone => !bones.has(bone));
    if (!absent.length) completeFrames++;
    for (const bone of absent) increment(missing, bone);
    for (const [, stage, reason] of frame.discards) increment(reasons, `${stage} · ${reason}`);
  }
  return {
    analyzedFrames,
    completeFrames,
    completePercentage: analyzedFrames ? Math.round(10_000*completeFrames/analyzedFrames)/100 : null,
    missingBones: ranked(missing),
    discardReasons: ranked(reasons),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 3) throw new Error('Uso: node tests/cuerpo-diagnostico-analizar.mjs <archivo.json>');
    const summary = summarizeDiagnostic(JSON.parse(await readFile(process.argv[2], 'utf8')));
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
