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
