import { FaceLandmarker, FilesetResolver, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { PoseEngine } from './bodyDiagnostic';
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

interface PoseDetector extends PoseEngine {
  landmarker: PoseLandmarker;
}

let pose: PoseDetector | undefined;
let lite: PoseDetector | undefined;
let live = false;
let adaptive = false;
let reportEngine = false;
let prepareFull = false;
let candidate: PoseDetector | undefined;
let warmupFrames = 0;
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

function hardwareWebGL() {
  try {
    const context = new OffscreenCanvas(1, 1).getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    if (!context) return false;
    const extension = context.getExtension('WEBGL_debug_renderer_info');
    const renderer = extension ? String(context.getParameter(extension.UNMASKED_RENDERER_WEBGL)) : '';
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return !/swiftshader|llvmpipe|software/i.test(renderer);
  } catch {
    return false;
  }
}

async function createPose(model: PoseEngine['model'], delegate: PoseEngine['delegate'], fullModel?: Uint8Array): Promise<PoseDetector> {
  const vision = await wasm();
  const source = fullModel ? { modelAssetBuffer: fullModel } : {
    modelAssetPath: new URL('/body-tracking/pose_landmarker_lite.task', scope.location.origin).href,
  };
  const landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: { ...source, delegate },
    canvas: new OffscreenCanvas(1, 1), runningMode: 'VIDEO', numPoses: 1,
    minPoseDetectionConfidence: .6, minPosePresenceConfidence: .6, minTrackingConfidence: .6,
    outputSegmentationMasks: false,
  });
  return { model, delegate, landmarker };
}

function closePose(detector: PoseDetector) {
  try { detector.landmarker.close(); } catch { /* The graph may already have lost its context. */ }
}

function engineChanged(reason: string) {
  if (reportEngine && pose) scope.postMessage({ type: 'pose-engine', model: pose.model, delegate: pose.delegate, reason });
}

function useLite(reason: string) {
  if (pose && lite && pose !== lite) {
    closePose(pose);
    pose = lite;
    engineChanged(reason);
  }
}

async function detectPose(frame: ImageBitmap, time: number) {
  if (!pose) throw new Error('El seguimiento no está listo.');
  if (candidate) {
    try {
      const first = candidate.landmarker.detectForVideo(frame, time);
      warmupFrames++;
      if (warmupFrames >= 3 && first.landmarks.length) {
        pose = candidate;
        candidate = undefined;
        engineChanged('full-activo');
        return first;
      }
      first.close();
      if (warmupFrames >= 6) {
        closePose(candidate);
        candidate = undefined;
        engineChanged('full-sin-pose-en-calentamiento');
      }
    } catch {
      if (candidate) closePose(candidate);
      candidate = undefined;
      engineChanged('full-fallo-en-calentamiento');
    }
  }
  try {
    return pose.landmarker.detectForVideo(frame, time);
  } catch (error) {
    if (!live) throw error;
    if (pose.model === 'full') {
      useLite('full-fallo-inferencia');
      try { return pose.landmarker.detectForVideo(frame, time); } catch { /* Retry using CPU below. */ }
    }
    if (pose.delegate === 'CPU') throw error;
    const failed = pose;
    pose = lite = await createPose('lite', 'CPU');
    closePose(failed);
    engineChanged('gpu-fallo-inferencia');
    return pose.landmarker.detectForVideo(frame, time);
  }
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
    const model = data.model === 'full' ? 'full' : 'lite';
    live = model === 'lite';
    adaptive = live && data.adaptive !== false;
    reportEngine = data.diagnostics === true;
    let reason = data.delegate === 'CPU' || !live ? 'cpu-solicitada' : 'webgl-sin-aceleracion';
    if (live && data.delegate !== 'CPU' && hardwareWebGL()) {
      try {
        pose = await createPose('lite', 'GPU');
        reason = 'inicio-gpu';
      } catch {
        reason = 'inicio-gpu-fallido';
      }
    }
    pose ??= await createPose(model, 'CPU', model === 'full' ? await loadModel('full') : undefined);
    if (live) lite = pose;
    engineChanged(reason);
    scope.postMessage({ type: 'ready', model: pose.model, delegate: pose.delegate, adaptive });
    return;
  }

  if (data.type === 'try-full' && adaptive && lite && !prepareFull) {
    prepareFull = true;
    try {
      const fullModel = await loadModel('full');
      candidate = await createPose('full', lite.delegate, fullModel);
      scope.postMessage({ type: 'pose-model-prepared', model: 'full' });
    } catch {
      engineChanged('full-no-disponible');
    }
    return;
  }

  if (data.type === 'use-lite') {
    useLite(data.reason === 'full-sin-pose' ? 'full-sin-pose'
      : data.reason === 'full-inferencia-lenta' ? 'full-inferencia-lenta' : 'full-fps-bajos');
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
      const result = await detectPose(frame, time);
      scope.postMessage({ type: 'pose', time, ms: performance.now()-started,
        model: pose?.model, delegate: pose?.delegate, points: result.landmarks[0] ?? [], world: result.worldLandmarks[0] ?? [] });
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
