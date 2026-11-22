import { useEffect, useState } from 'react';
import type { ProgressEvent } from './index';
import { calcularRacha } from './racha';

const medianoche = [24] as const;

export function useRacha(events: readonly ProgressEvent[], horas: readonly number[] = medianoche) {
  const [fecha, setFecha] = useState(() => new Date());

  useEffect(() => {
    let timer: number;
    const revisar = () => {
      window.clearTimeout(timer);
      const ahora = new Date();
      setFecha(ahora);
      const proxima = new Date(ahora);
      proxima.setHours(horas.find(hora => hora > ahora.getHours()) ?? 24, 0, 0, 0);
      timer = window.setTimeout(revisar, proxima.getTime() - ahora.getTime());
    };
    revisar();
    window.addEventListener('focus', revisar);
    document.addEventListener('visibilitychange', revisar);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', revisar);
      document.removeEventListener('visibilitychange', revisar);
    };
  }, [horas]);

  return { ...calcularRacha(events, fecha), fecha };
}
