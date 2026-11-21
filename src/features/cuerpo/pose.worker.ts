import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
const fullModelUrl = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task';
const fullModelCache = 'pose-landmarker-full-v1';
let detector: PoseLandmarker | undefined;

async function loadFullModel() {
  // Keep the versioned model available across app and service worker updates.
  const cache = await globalThis.caches?.open(fullModelCache).catch(() => undefined);
  const cached = await cache?.match(fullModelUrl).catch(() => undefined);
  if (cached) return new Uint8Array(await cached.arrayBuffer());
  const response = await fetch(fullModelUrl);
  if (!response.ok) throw new Error('No se pudo descargar el modelo de captura precisa.');
  const bytes = new Uint8Array(await response.clone().arrayBuffer());
  await cache?.put(fullModelUrl, response).catch(() => { /* The downloaded model can still run. */ });
  return bytes;
}

const scope = self as unknown as { onmessage: ((event: MessageEvent) => void) | null; postMessage(data: unknown): void; location: Location };
scope.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      if (typeof OffscreenCanvas === 'undefined') throw new Error('Este navegador necesita una versión compatible con OffscreenCanvas.');
      const [vision, fullModel] = await Promise.all([
        FilesetResolver.forVisionTasks(new URL('/body-tracking/wasm', scope.location.origin).href),
        data.model === 'full' ? loadFullModel() : undefined,
      ]);
      detector = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: fullModel ? { modelAssetBuffer: fullModel, delegate: 'CPU' } : {
          modelAssetPath: new URL('/body-tracking/pose_landmarker_lite.task', scope.location.origin).href,
          delegate: 'CPU',
        },
        canvas: new OffscreenCanvas(1, 1), runningMode: 'VIDEO', numPoses: 1,
        minPoseDetectionConfidence: .6, minPosePresenceConfidence: .6, minTrackingConfidence: .6,
        outputSegmentationMasks: false,
      });
      scope.postMessage({ type: 'ready' });
    } else if (data.type === 'frame') {
      const frame = data.frame as ImageBitmap;
      try {
        if (!detector) throw new Error('El seguimiento no está listo.');
        const result = detector.detectForVideo(frame, data.timestamp);
        scope.postMessage({
          type: 'pose',
          time: data.timestamp,
          points: result.landmarks[0] ?? [],
          world: result.worldLandmarks[0] ?? [],
        });
        result.close();
      } finally { frame.close(); }
    }
  } catch (error) { scope.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Error de seguimiento' }); }
};
