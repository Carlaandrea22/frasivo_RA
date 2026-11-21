import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
let detector: PoseLandmarker | undefined;
const scope = self as unknown as { onmessage: ((event: MessageEvent) => void) | null; postMessage(data: unknown): void; location: Location };
scope.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      if (typeof OffscreenCanvas === 'undefined') throw new Error('Este navegador necesita una versión compatible con OffscreenCanvas.');
      const vision = await FilesetResolver.forVisionTasks(new URL('/vision', scope.location.origin).href);
      detector = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: new URL('/models/pose_landmarker_lite.task', scope.location.origin).href, delegate: 'CPU' },
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
        scope.postMessage({ type: 'pose', points: result.landmarks[0] ?? [] });
        result.close();
      } finally { frame.close(); }
    }
  } catch (error) { scope.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Error de seguimiento' }); }
};
