import { useCallback, useEffect, useRef, useState } from 'react';

export function useObjectCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const resources = useRef<{ stream?: MediaStream; timer?: number; generation: number }>({ generation: 0 });
  const [status, setStatus] = useState<'idle' | 'permission' | 'active' | 'error'>('idle');
  const [error, setError] = useState('');
  const release = useCallback(() => {
    const current = resources.current; current.generation++;
    clearTimeout(current.timer); current.timer = undefined;
    current.stream?.getTracks().forEach(track => { track.onended = null; track.stop(); });
    current.stream = undefined;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);
  const stop = useCallback(() => { release(); setStatus('idle'); }, [release]);
  const start = useCallback(async () => {
    release(); setError(''); const token = resources.current.generation;
    const fail = (message: string) => {
      if (token !== resources.current.generation) return;
      release(); setError(message); setStatus('error');
    };
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      fail('La cámara necesita HTTPS o localhost. Puedes seguir explorando sin cámara.'); return;
    }
    setStatus('permission');
    resources.current.timer = window.setTimeout(() => fail('La cámara tardó demasiado. Puedes volver a intentarlo o estudiar sin cámara.'), 30000);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      if (token !== resources.current.generation) { stream.getTracks().forEach(track => track.stop()); return; }
      resources.current.stream = stream;
      stream.getVideoTracks().forEach(track => { track.onended = () => fail('La cámara se desconectó. Puedes activarla de nuevo.'); });
      if (!videoRef.current) { stop(); return; }
      videoRef.current.srcObject = stream; await videoRef.current.play();
      if (token !== resources.current.generation) return;
      clearTimeout(resources.current.timer); setStatus('active');
    } catch (cause) {
      const name = cause instanceof Error ? cause.name : '';
      fail(name === 'NotAllowedError' || name === 'SecurityError'
        ? 'El permiso de cámara está bloqueado. Actívalo en los permisos del sitio o sigue sin cámara.'
        : name === 'NotFoundError' ? 'No encontramos una cámara. Puedes seguir explorando los objetos en 3D.'
        : 'No pudimos abrir la cámara. Comprueba si otra aplicación la está usando o sigue sin cámara.');
    }
  }, [release, stop]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) stop(); };
    const pageHide = () => stop();
    document.addEventListener('visibilitychange', hidden); window.addEventListener('pagehide', pageHide);
    return () => { document.removeEventListener('visibilitychange', hidden); window.removeEventListener('pagehide', pageHide); release(); };
  }, [release, stop]);
  return { videoRef, status, error, start, stop };
}
