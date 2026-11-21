import { FilesetResolver, ObjectDetector } from '@mediapipe/tasks-vision';
import type { RawRecognition } from './learning';
import { detectorConfig } from './scanning';
let detector: ObjectDetector | undefined;
const scope = self as unknown as { onmessage: ((event: MessageEvent) => void) | null; postMessage(data: unknown): void; location: Location };
scope.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      const vision = await FilesetResolver.forVisionTasks(new URL('/vision', scope.location.origin).href);
      const options = { ...detectorConfig(), baseOptions: { modelAssetPath: new URL('/models/efficientdet-lite0.tflite', scope.location.origin).href } };
      if (typeof OffscreenCanvas === 'undefined') throw new Error('OffscreenCanvas no está disponible en este navegador. Comprueba la versión de iOS.');
      // Chrome on iPhone uses CriOS in its UA. MediaPipe's automatic canvas
      // selection can mistake it for unsupported Safari and call document
      // inside this worker. Supplying the documented canvas option avoids it.
      // Each delegate gets a fresh canvas in case GPU initialization fails.
      let delegate = 'GPU';
      try { detector = await ObjectDetector.createFromOptions(vision, { ...options, canvas: new OffscreenCanvas(1, 1), baseOptions: { ...options.baseOptions, delegate: 'GPU' } }); }
      catch { delegate = 'CPU'; detector = await ObjectDetector.createFromOptions(vision, { ...options, canvas: new OffscreenCanvas(1, 1), baseOptions: { ...options.baseOptions, delegate: 'CPU' } }); }
      scope.postMessage({ type: 'ready', delegate });
    } else if (data.type === 'frame') {
      const frame = data.frame as ImageBitmap;
      try {
        if (!detector) throw new Error('Detector no disponible');
        const started = performance.now();
        const result = detector.detectForVideo(frame, data.timestamp);
        const inferenceMs = performance.now() - started;
        const detections: RawRecognition[] = result.detections.map(d => ({ label: d.categories[0]?.categoryName ?? '', score: d.categories[0]?.score ?? 0, box: d.boundingBox ? { x: d.boundingBox.originX / frame.width, y: d.boundingBox.originY / frame.height, width: d.boundingBox.width / frame.width, height: d.boundingBox.height / frame.height } : undefined }));
        scope.postMessage({ type: 'results', detections, inferenceMs });
      } finally { frame.close(); }
    }
  } catch (error) { scope.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Error del detector' }); }
};
