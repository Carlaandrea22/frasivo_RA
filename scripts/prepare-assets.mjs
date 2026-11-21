import { cp, mkdir, access, rename, rm } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
await mkdir('public/body-tracking', { recursive: true });
await cp('node_modules/@mediapipe/tasks-vision/wasm', 'public/body-tracking/wasm', { recursive: true });
const poseTarget = 'public/body-tracking/pose_landmarker_lite.task';
try { await access(poseTarget); console.log('Modelo corporal local disponible.'); }
catch {
  console.log('Descargando Pose Landmarker Lite para anatomía local…');
  try {
    const response = await fetch('https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task', { signal: AbortSignal.timeout(120000) });
    if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
    await pipeline(Readable.fromWeb(response.body), createWriteStream(`${poseTarget}.part`));
    await rename(`${poseTarget}.part`, poseTarget);
    console.log('Modelo corporal descargado.');
  } catch (error) {
    await rm(`${poseTarget}.part`, { force: true });
    throw new Error('No se pudo descargar el modelo corporal. Reintenta con npm run assets.', { cause: error });
  }
}
