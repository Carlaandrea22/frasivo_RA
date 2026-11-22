import { cp, mkdir, access, rename, rm } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
await mkdir('public/body-tracking', { recursive: true });
await cp('node_modules/@mediapipe/tasks-vision/wasm', 'public/body-tracking/wasm', { recursive: true });
for (const variant of ['lite', 'full']) {
  const name = `pose_landmarker_${variant}`;
  const poseTarget = `public/body-tracking/${name}.task`;
  try {
    await access(poseTarget);
    console.log(`Modelo ${name} disponible.`);
    continue;
  } catch { /* Download the missing model. */ }
  console.log(`Descargando ${name} para anatomía local…`);
  try {
    const response = await fetch(`https://storage.googleapis.com/mediapipe-models/pose_landmarker/${name}/float16/1/${name}.task`, { signal: AbortSignal.timeout(120000) });
    if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
    await pipeline(Readable.fromWeb(response.body), createWriteStream(`${poseTarget}.part`));
    await rename(`${poseTarget}.part`, poseTarget);
    console.log(`Modelo ${name} descargado.`);
  } catch (error) {
    await rm(`${poseTarget}.part`, { force: true });
    throw new Error(`No se pudo descargar ${name}. Reintenta con npm run assets.`, { cause: error });
  }
}
