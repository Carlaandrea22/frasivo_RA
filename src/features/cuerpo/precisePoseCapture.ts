import { averagePreciseCapture, captureIssue, preciseCaptureDuration, preciseCaptureEdgeTolerance,
  type PoseSample, type PrecisePose } from './poseCapture';
import workerUrl from '../../generated/pose.worker.js?url';

const modelError = 'No se pudo cargar el modelo de captura precisa. Comprueba la conexión e inténtalo de nuevo.';
const frameError = 'No se pudo analizar la cámara. Comprueba que sigue activa e inténtalo de nuevo.';
const captureError = 'No hubo suficientes cuadros para fijar la pose. Quédate quieto e inténtalo de nuevo.';
const maximumCaptureDuration = 4500;

export function capturePrecisePose(
  video: HTMLVideoElement,
  viewportAspect: number,
  onProgress: (progress: number) => void,
  signal: AbortSignal,
): Promise<PrecisePose> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(signal.reason); return; }
    let worker: Worker;
    try {
      worker = new Worker(workerUrl);
    } catch {
      reject(new Error(modelError));
      return;
    }

    const samples: PoseSample[] = [];
    let start: number | undefined, animation = 0, lastVideoTime = -1;
    let progress = -1, busy = false, settled = false;
    let timeout = window.setTimeout(() => fail(modelError), 45000);

    function cleanup() {
      settled = true;
      cancelAnimationFrame(animation);
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      worker.terminate();
    }

    function fail(message: string) {
      cleanup();
      reject(new Error(message));
    }

    function abort() {
      cleanup();
      reject(signal.reason);
    }

    async function sampleFrame(now: number) {
      if (busy || video.readyState < 2 || video.currentTime === lastVideoTime) return;
      busy = true;
      lastVideoTime = video.currentTime;
      let frame: ImageBitmap | undefined;
      try {
        const scale = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
        frame = await createImageBitmap(video, {
          resizeWidth: Math.max(1, Math.round(video.videoWidth * scale)),
          resizeHeight: Math.max(1, Math.round(video.videoHeight * scale)),
        });
        if (settled) { frame.close(); return; }
        worker.postMessage({ type: 'frame', frame, timestamp: now }, [frame]);
      } catch {
        frame?.close();
        if (!settled) fail(frameError);
      }
    }

    function collect(now: number) {
      start ??= now;
      const next = Math.min((now - start) / preciseCaptureDuration, 1);
      if (next > progress) {
        progress = next;
        onProgress(progress);
        if (settled) return;
      }
      const lastSample = samples.at(-1);
      const hasCoverage = samples.length >= 3 &&
        lastSample!.time >= start + preciseCaptureDuration - preciseCaptureEdgeTolerance;
      // Slower devices may need longer to collect three frames across the capture.
      if (progress < 1 || (!hasCoverage && now - start < maximumCaptureDuration)) {
        void sampleFrame(now);
      } else if (!busy) {
        const aspect = video.videoWidth / video.videoHeight;
        const issue = samples.map(sample => captureIssue(sample, aspect, viewportAspect)).find(Boolean);
        const duration = Math.max(preciseCaptureDuration, (lastSample?.time ?? start) - start);
        const pose = averagePreciseCapture(samples, start, aspect, viewportAspect, duration);
        if (!pose) { fail(issue || captureError); return; }
        cleanup();
        resolve(pose);
        return;
      }
      animation = requestAnimationFrame(collect);
    }

    signal.addEventListener('abort', abort, { once: true });
    worker.onerror = () => fail(start === undefined ? modelError : frameError);
    worker.onmessage = ({ data }) => {
      if (settled) return;
      if (data.type === 'ready') {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => fail(captureError), maximumCaptureDuration + 1500);
        animation = requestAnimationFrame(collect);
      } else if (data.type === 'pose') {
        samples.push({ time: data.time, points: data.points, world: data.world });
        busy = false;
      } else if (data.type === 'error') {
        fail(start === undefined ? modelError : frameError);
      }
    };
    try {
      worker.postMessage({ type: 'init', model: 'full' });
    } catch {
      fail(modelError);
    }
  });
}
