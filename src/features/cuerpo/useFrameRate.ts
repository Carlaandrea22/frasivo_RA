import { useCallback, useEffect, useRef, useState } from 'react';

export function useFrameRate() {
  const [fps, setFps] = useState<number | null>(null);
  const sample = useRef({ started: 0, count: 0 });
  const reset = useCallback(() => {
    sample.current = { started: 0, count: 0 };
    setFps(null);
  }, []);
  const record = useCallback((now: number) => {
    const data = sample.current;
    if (!data.started || now - data.started > 2000) {
      sample.current = { started: now, count: 0 };
      return;
    }
    data.count++;
    const elapsed = now - data.started;
    if (elapsed >= 1000) {
      setFps(Math.round(data.count * 1000 / elapsed));
      sample.current = { started: now, count: 0 };
    }
  }, []);
  // A paused or static source should not leave a stale sampling rate on screen.
  useEffect(() => {
    if (fps === null) return;
    const timer = window.setInterval(() => {
      if (sample.current.started && performance.now() - sample.current.started > 2000) reset();
    }, 1000);
    return () => clearInterval(timer);
  }, [fps, reset]);
  return { fps, record, reset };
}
