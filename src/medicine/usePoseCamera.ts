import { useCallback, useEffect, useState } from 'react';
import { useObjectCamera } from '../objects/useObjectCamera';
import { torsoTransform, type BodyPoint } from './anatomy';
import workerUrl from '../generated/pose.worker.js?url';

export function usePoseCamera(suspended: boolean) {
  const camera = useObjectCamera();
  const { status, stop, videoRef } = camera;
  const [points, setPoints] = useState<BodyPoint[]>([]);
  const [tracking, setTracking] = useState<'loading' | 'searching' | 'tracking'>('loading');
  const [modelError, setModelError] = useState('');
  const [aspect, setAspect] = useState(4 / 5);
  useEffect(() => { if (suspended) stop(); }, [suspended, stop]);
  useEffect(() => {
    if (status !== 'active' || suspended) return;
    let disposed = false, ready = false, busy = false, lastVideoTime = -1, lastResult = 0;
    let worker: Worker | undefined;
    let previous: BodyPoint[] = [];
    setModelError(''); setPoints([]); setTracking('loading');
    const fail = (message: string) => {
      if (disposed) return;
      setModelError(message); setPoints([]); stop();
    };
    const startup = window.setTimeout(() => fail('El modelo tardó demasiado en cargar. Comprueba la conexión y vuelve a activar la cámara.'), 45000);
    try {
      worker = new Worker(workerUrl);
      worker.onmessage = ({ data }) => {
        if (disposed) return;
        if (data.type === 'ready') { clearTimeout(startup); ready = true; setTracking('searching'); }
        if (data.type === 'pose') {
          busy = false; lastResult = performance.now();
          // Smooth only confident landmarks. A lost landmark is never filled from an old frame.
          const next: BodyPoint[] = data.points.map((p: BodyPoint, i: number) => {
            const old = previous[i];
            return old && (old.visibility ?? 0) >= .6 && (p.visibility ?? 0) >= .6
              ? { ...p, x: old.x * .3 + p.x * .7, y: old.y * .3 + p.y * .7 } : p;
          });
          previous = next;
          const visible = !!torsoTransform(next);
          setPoints(visible ? next : []); setTracking(visible ? 'tracking' : 'searching');
        }
        if (data.type === 'error') fail('No se pudo iniciar el seguimiento corporal. Vuelve a activar la cámara; si persiste, prueba un navegador actualizado.');
      };
      worker.onerror = () => fail('No se pudo cargar el seguimiento corporal. Comprueba la conexión y reintenta.');
      worker.postMessage({ type: 'init' });
    } catch { fail('El seguimiento corporal no está disponible en este navegador. Puedes explorar la demostración.'); }
    const timer = window.setInterval(async () => {
      if (disposed) return;
      const now = performance.now();
      if (lastResult && now - lastResult > 700) { previous = []; setPoints([]); setTracking('searching'); }
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
  }, [status, suspended, stop, videoRef]);
  const start = useCallback(() => {
    setPoints([]); setTracking('loading'); setModelError('');
    return camera.start();
  }, [camera.start]);
  return { ...camera, start, points: status === 'active' ? points : [], tracking, modelError, aspect };
}
