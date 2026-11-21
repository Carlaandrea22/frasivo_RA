import { useCallback, useEffect, useRef, useState } from 'react';
import { recognizedWords, type Recognition } from './learning';
import { nextFrameDelay } from './scanning';
import { createObjectTracker, type TrackedRecognition } from './objectTracking';
import detectorWorkerUrl from './generated/detector.worker.js?url';
export type CameraStatus = 'idle' | 'permission' | 'loading' | 'scanning' | 'error';
export function cameraError(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'El permiso de cámara está bloqueado. Actívalo en los permisos del sitio e inténtalo de nuevo.';
  if (name === 'NotFoundError') return 'No encontramos una cámara. Conecta una o utiliza la práctica manual.';
  if (name === 'NotReadableError') return 'La cámara está ocupada. Cierra otras aplicaciones que la utilicen e inténtalo de nuevo.';
  return 'No pudimos iniciar el reconocimiento. Comprueba la cámara y recarga la aplicación. Puedes usar la práctica manual.';
}
export function useCamera(onRecognized: (results: Recognition[]) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const resources = useRef<{ stream?: MediaStream; worker?: Worker; timer?: number; timeout?: number; expiry?: number; captureTimeout?: number }>({});
  const generation = useRef(0);
  const onResults = useRef(onRecognized);
  onResults.current = onRecognized;
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState('');
  const [diagnostic, setDiagnostic] = useState('');
  const [detections, setDetections] = useState<TrackedRecognition[]>([]);
  const [metrics, setMetrics] = useState<{ fps: number; inferenceMs: number; delegate: string } | null>(null);
  const release = useCallback(() => {
    generation.current++;
    clearTimeout(resources.current.timer);
    clearTimeout(resources.current.timeout);
    clearTimeout(resources.current.expiry);
    clearTimeout(resources.current.captureTimeout);
    resources.current.stream?.getTracks().forEach(t => t.stop());
    resources.current.worker?.terminate();
    resources.current = {};
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);
  const stop = useCallback(() => { release(); setStatus('idle'); setDetections([]); setMetrics(null); }, [release]);
  const start = useCallback(async () => {
    release(); setDetections([]); setMetrics(null); setError(''); setDiagnostic('');
    const token = generation.current;
    const fail = (message: string) => { if (token !== generation.current) return; release(); setDetections([]); setMetrics(null); setError(message); setStatus('error'); };
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      fail('La cámara necesita HTTPS o localhost y un navegador compatible. Abre un enlace seguro o usa la práctica manual.'); return;
    }
    setStatus('permission');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      if (token !== generation.current) { stream.getTracks().forEach(t => t.stop()); return; }
      resources.current.stream = stream;
      stream.getVideoTracks().forEach(track => { track.onended = () => fail('La cámara se desconectó. Vuelve a conectarla y activa el escaneo.'); });
      const video = videoRef.current;
      if (!video) { stop(); return; }
      video.srcObject = stream;
      await video.play();
      if (token !== generation.current) return;
      setStatus('loading');
      const worker = new Worker(detectorWorkerUrl);
      resources.current.worker = worker;
      resources.current.timeout = window.setTimeout(() => fail('El modelo está tardando demasiado. Detén el escaneo y vuelve a intentarlo.'), 60000);
      const tracker = createObjectTracker(`scan-${token}`);
      const scheduleExpiry = () => {
        clearTimeout(resources.current.expiry);
        const remaining = tracker.timeUntilExpiry(performance.now());
        if (remaining !== null) resources.current.expiry = window.setTimeout(() => {
          if (token !== generation.current) return;
          setDetections(tracker.expire(performance.now()));
          scheduleExpiry();
        }, Math.max(1, remaining));
      };
      let sentAt = 0, lastVideoTime = -1, lastCompleted = 0, metricsAt = 0, smoothedFps = 0, delegate = 'GPU';
      const frame = async () => {
        if (token !== generation.current || !videoRef.current) return;
        if (video.readyState < 2) { resources.current.timer = window.setTimeout(frame, 200); return; }
        if (video.currentTime === lastVideoTime) { resources.current.timer = window.setTimeout(frame, 16); return; }
        try {
          sentAt = performance.now();
          lastVideoTime = video.currentTime;
          const bitmap = await createImageBitmap(video);
          if (token !== generation.current) { bitmap.close(); return; }
          clearTimeout(resources.current.captureTimeout);
          worker.postMessage({ type: 'frame', frame: bitmap, timestamp: performance.now() }, [bitmap]);
          resources.current.timeout = window.setTimeout(() => fail('El análisis de cámara se detuvo. Detén el escaneo y vuelve a intentarlo.'), 10000);
        } catch (e) { fail(cameraError(e)); }
      };
      const scheduleFrame = (delay: number) => {
        resources.current.captureTimeout = window.setTimeout(() => fail('La imagen de la cámara se detuvo. Detén el escaneo y vuelve a activarlo.'), 5000);
        resources.current.timer = window.setTimeout(frame, delay);
      };
      worker.onmessage = ({ data }) => {
        if (token !== generation.current) return;
        if (data.type === 'ready') { clearTimeout(resources.current.timeout); delegate = data.delegate ?? 'GPU'; setStatus('scanning'); scheduleFrame(0); }
        if (data.type === 'results') {
          clearTimeout(resources.current.timeout);
          const now = performance.now();
          const results = recognizedWords(data.detections);
          tracker.setFrameInterval(lastCompleted ? now - lastCompleted : now - sentAt);
          setDetections(tracker.update(data.detections, now)); onResults.current(results);
          scheduleExpiry();
          if (lastCompleted) {
            const fps = 1000 / Math.max(1, now - lastCompleted);
            smoothedFps = smoothedFps ? smoothedFps * .7 + fps * .3 : fps;
          }
          lastCompleted = now;
          if (now - metricsAt >= 1000) {
            setMetrics({ fps: smoothedFps, inferenceMs: Number.isFinite(data.inferenceMs) ? data.inferenceMs : now - sentAt, delegate });
            metricsAt = now;
          }
          scheduleFrame(nextFrameDelay(now - sentAt));
        }
        if (data.type === 'error') {
          setDiagnostic(typeof data.message === 'string' ? data.message.slice(0, 600) : 'El detector no devolvió un detalle.');
          fail('No se pudo cargar o ejecutar el modelo local. Revisa el detalle del error e inténtalo de nuevo.');
        }
      };
      worker.onerror = event => {
        setDiagnostic(event.message?.slice(0, 600) || 'El navegador no devolvió un detalle.');
        fail('Este navegador no pudo iniciar el reconocimiento local. Revisa el detalle del error.');
      };
      worker.postMessage({ type: 'init' });
    } catch (e) { fail(cameraError(e)); }
  }, [release, stop]);
  useEffect(() => {
    const pause = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', pause);
    return () => { document.removeEventListener('visibilitychange', pause); release(); };
  }, [release, stop]);
  return { videoRef, status, error, diagnostic, detections, metrics, start, stop };
}
