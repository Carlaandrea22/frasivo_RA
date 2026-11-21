import { cp, mkdir, access, rename, rm } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
await mkdir('public/vision', { recursive: true });
await mkdir('public/models', { recursive: true });
await cp('node_modules/@mediapipe/tasks-vision/wasm', 'public/vision', { recursive: true });
const target = 'public/models/efficientdet-lite0.tflite';
try { await access(target); console.log('Modelo local disponible.'); }
catch {
  console.log('Descargando EfficientDet-Lite0 para reconocimiento local…');
  const url = 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite';
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
    if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
    await pipeline(Readable.fromWeb(response.body), createWriteStream(`${target}.part`));
    await rename(`${target}.part`, target);
    console.log('Modelo descargado. Las imágenes se procesan en el dispositivo.');
  } catch (error) {
    await rm(`${target}.part`, { force: true });
    throw new Error('No se pudo descargar el modelo. Reintenta con npm run assets.', { cause: error });
  }
}

const poseTarget = 'public/models/pose_landmarker_lite.task';
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
