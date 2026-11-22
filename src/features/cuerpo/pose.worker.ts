import { FaceLandmarker, FilesetResolver, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { FaceRegion, HandRegion, Specialist } from './regionalDetection';

const paths = {
  full: '/body-tracking/pose_landmarker_full.task',
  hand: '/body-tracking/hand_landmarker.task',
  face: '/body-tracking/face_landmarker.task',
};

const cachesByModel = {
  full: 'pose-landmarker-full-v1',
  hand: 'body-hand-landmarker-v1',
  face: 'body-face-landmarker-v1',
};

let pose: PoseLandmarker | undefined;
let hand: HandLandmarker | undefined;
let face: FaceLandmarker | undefined;
let fileset: ReturnType<typeof FilesetResolver.forVisionTasks> | undefined;

const scope = self as unknown as {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(data: unknown): void;
  location: Location;
};

function wasm() {
  return fileset ??= FilesetResolver.forVisionTasks(new URL('/body-tracking/wasm', scope.location.origin).href);
}

function isTaskBundle(bytes: Uint8Array) {
  // MediaPipe .task archives have a ZIP local header, sometimes after two padding bytes.
  return bytes.byteLength > 1024 && [0, 2].some(i =>
    bytes[i] === 0x50 && bytes[i+1] === 0x4b && bytes[i+2] === 3 && bytes[i+3] === 4);
}

async function loadModel(model: keyof typeof paths) {
  const path = paths[model];
  const cache = await globalThis.caches?.open(cachesByModel[model]).catch(() => undefined);
  const cached = await cache?.match(path).catch(() => undefined);
  if (cached) {
    const bytes = new Uint8Array(await cached.arrayBuffer());
    if (isTaskBundle(bytes)) return bytes;
    await cache?.delete(path).catch(() => {});
  }
  const response = await fetch(path, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error('No se pudo descargar el modelo de seguimiento.');
  const bytes = new Uint8Array(await response.clone().arrayBuffer());
  if (!isTaskBundle(bytes)) throw new Error('El archivo de seguimiento no es un modelo válido.');
  await cache?.put(path, response).catch(() => { /* The downloaded model can still run. */ });
  return bytes;
}

async function prepareSpecialist(kind: Specialist) {
  const [vision, modelAssetBuffer] = await Promise.all([wasm(), loadModel(kind)]);
  const common = {
    baseOptions: { modelAssetBuffer, delegate: 'CPU' as const },
    canvas: new OffscreenCanvas(1, 1),
    runningMode: 'VIDEO' as const,
    minTrackingConfidence: .5,
  };
  if (kind === 'hand') {
    hand = await HandLandmarker.createFromOptions(vision, {
      ...common, numHands: 2, minHandDetectionConfidence: .55, minHandPresenceConfidence: .5,
    });
  } else {
    face = await FaceLandmarker.createFromOptions(vision, {
      ...common, numFaces: 1, minFaceDetectionConfidence: .53, minFacePresenceConfidence: .52,
      outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true,
    });
  }
}

async function process(data: MessageEvent['data']) {
  if (data.type === 'init') {
    if (typeof OffscreenCanvas === 'undefined') throw new Error('Este navegador necesita una versión compatible con OffscreenCanvas.');
    const [vision, fullModel] = await Promise.all([wasm(), data.model === 'full' ? loadModel('full') : undefined]);
    pose = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: fullModel ? { modelAssetBuffer: fullModel, delegate: 'CPU' } : {
        modelAssetPath: new URL('/body-tracking/pose_landmarker_lite.task', scope.location.origin).href, delegate: 'CPU',
      },
      canvas: new OffscreenCanvas(1, 1), runningMode: 'VIDEO', numPoses: 1,
      minPoseDetectionConfidence: .6, minPosePresenceConfidence: .6, minTrackingConfidence: .6,
      outputSegmentationMasks: false,
    });
    scope.postMessage({ type: 'ready' });
    return;
  }

  if (data.type === 'prepare') {
    const kind: Specialist = data.detector;
    try {
      await prepareSpecialist(kind);
      scope.postMessage({ type: 'detector-ready', kind });
    } catch (error) {
      scope.postMessage({ type: 'detector-unavailable', kind, message: error instanceof Error ? error.message : undefined });
    }
    return;
  }

  if (data.type !== 'frame') return;
  const frame = data.frame as ImageBitmap;
  const time: number = data.timestamp;
  const started = performance.now();
  try {
    if (data.detector === 'hand') {
      if (!hand) throw new Error('El seguimiento de manos no está listo.');
      const result = hand.detectForVideo(frame, time);
      const hands: HandRegion[] = result.landmarks.flatMap((landmarks, i) => {
        const category = result.handedness[i]?.[0];
        const worldLandmarks = result.worldLandmarks[i];
        if (!category || !worldLandmarks || (category.categoryName !== 'Left' && category.categoryName !== 'Right')) return [];
        return [{ landmarks, worldLandmarks, side: category.categoryName === 'Left' ? 'left' : 'right', confidence: category.score }];
      });
      scope.postMessage({ type: 'hand', time, ms: performance.now()-started, hands });
    } else if (data.detector === 'face') {
      if (!face) throw new Error('El seguimiento facial no está listo.');
      const result = face.detectForVideo(frame, time);
      const [landmarks] = result.faceLandmarks;
      const raw = result.facialTransformationMatrixes[0]?.data;
      const jawOpen = result.faceBlendshapes[0]?.categories.find(category => category.categoryName === 'jawOpen')?.score ?? 0;
      // The geometry proto serializes in column-major order. Normalize the wire data to rows.
      const region: FaceRegion | null = landmarks && raw?.length === 16 ? {
        landmarks, jawOpen, matrix: raw.map((_, i) => raw[(i % 4)*4 + (i >> 2)]),
      } : null;
      scope.postMessage({ type: 'face', time, ms: performance.now()-started, face: region });
    } else {
      if (!pose) throw new Error('El seguimiento no está listo.');
      const result = pose.detectForVideo(frame, time);
      scope.postMessage({ type: 'pose', time, ms: performance.now()-started, points: result.landmarks[0] ?? [], world: result.worldLandmarks[0] ?? [] });
      result.close();
    }
  } finally {
    frame.close();
  }
}

scope.onmessage = ({ data }) => {
  void process(data).catch(error => {
    const message = error instanceof Error ? error.message : 'Error de seguimiento';
    if (data.type === 'frame' && (data.detector === 'hand' || data.detector === 'face')) {
      scope.postMessage({ type: 'detector-unavailable', kind: data.detector, message, frame: true });
    } else {
      scope.postMessage({ type: 'error', message });
    }
  });
};
