import { useCallback, useEffect, useState } from 'react';
import { useBodyCamera } from './useBodyCamera';
import { captureWindow, type PoseSample } from './poseCapture';
import workerUrl from '../../generated/pose.worker.js?url';

export function usePoseCamera(onDetection?: (time: number) => void) {
  const camera = useBodyCamera();
  const { status, stop, videoRef } = camera;
  const [history, setHistory] = useState<PoseSample[]>([]);
  const [tracking, setTracking] = useState<'loading' | 'searching' | 'tracking'>('loading');
  const [modelError, setModelError] = useState('');
  const [aspect, setAspect] = useState(4 / 5);
  useEffect(() => {
    if (status !== 'active') return;
    let disposed = false, ready = false, busy = false, lastVideoTime = -1, lastResult = 0;
    let worker: Worker | undefined;
    setModelError(''); setHistory([]); setTracking('loading');
    const fail = (message: string) => {
      if (disposed) return;
      setModelError(message); setHistory([]); stop();
    };
    const startup = window.setTimeout(() => fail('El modelo tardó demasiado en cargar. Comprueba la conexión y vuelve a activar la cámara.'), 45000);
    try {
      worker = new Worker(workerUrl);
      worker.onmessage = ({ data }) => {
        if (disposed) return;
        if (data.type === 'ready') { clearTimeout(startup); ready = true; setTracking('searching'); }
        if (data.type === 'pose') {
          busy = false; lastResult = performance.now();
          onDetection?.(lastResult);
          const sample: PoseSample = { time: data.time, points: data.points, world: data.world };
          setHistory(previous => sample.points.length
            ? [...previous.filter(frame => sample.time - frame.time <= captureWindow), sample] : []);
          setTracking(sample.points.length ? 'tracking' : 'searching');
        }
        if (data.type === 'error') fail('No se pudo iniciar el seguimiento corporal. Vuelve a activar la cámara; si persiste, prueba un navegador actualizado.');
      };
      worker.onerror = () => fail('No se pudo cargar el seguimiento corporal. Comprueba la conexión y reintenta.');
      worker.postMessage({ type: 'init' });
    } catch { fail('El seguimiento corporal no está disponible en este navegador. Puedes explorar la demostración.'); }
    const timer = window.setInterval(async () => {
      if (disposed) return;
      const now = performance.now();
      if (lastResult && now - lastResult > 700) { setHistory(previous => previous.length ? [] : previous); setTracking('searching'); }
      if (busy && lastResult && now - lastResult > 15000) { fail('El seguimiento dejó de responder. Vuelve a activar la cámara.'); return; }
      const video = videoRef.current;
      if (!ready || busy || !video || video.readyState < 2 || video.currentTime === lastVideoTime) return;
      busy = true; lastVideoTime = video.currentTime;
      if (!lastResult) lastResult = now;
      setAspect(video.videoWidth / video.videoHeight);
      try {
        const frame = await createImageBitmap(video, { resizeWidth: 640, resizeHeight: Math.max(1, Math.round(640 * video.videoHeight / video.videoWidth)) });
        if (disposed) { frame.close(); return; }
        worker!.postMessage({ type: 'frame', frame, timestamp: performance.now() }, [frame]);
      } catch { fail('No se pudo analizar la cámara. Prueba un navegador actualizado o vuelve a intentarlo.'); }
    }, 100);
    return () => { disposed = true; clearInterval(timer); clearTimeout(startup); worker?.terminate(); };
  }, [status, stop, videoRef, onDetection]);
  const startCamera = camera.start;
  const start = useCallback(() => {
    setHistory([]); setTracking('loading'); setModelError('');
    return startCamera();
  }, [startCamera]);
  const samples = status === 'active' ? history : [];
  return { ...camera, start, samples, points: samples.at(-1)?.points ?? [], tracking, modelError, aspect };
}
