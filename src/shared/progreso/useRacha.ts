import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ProgressEvent } from './index';
import { calcularRacha } from './racha';

const clavePruebas = 'lumar.racha:simulada';
const listeners = new Set<() => void>();
let simulacion: number | null | undefined;

function leerSimulacion(): number | null {
  if (!import.meta.env.DEV) return null;
  if (simulacion !== undefined) return simulacion;
  try {
    const guardada = window.sessionStorage.getItem(clavePruebas);
    const dias = guardada === null ? NaN : Number(guardada);
    simulacion = Number.isSafeInteger(dias) && dias >= 0 ? dias : null;
  } catch {
    simulacion = null;
  }
  return simulacion;
}

function suscribirSimulacion(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function simularRacha(dias: number | null) {
  if (!import.meta.env.DEV) return;
  simulacion = dias === null ? null : Math.max(0, dias);
  try {
    if (simulacion === null) window.sessionStorage.removeItem(clavePruebas);
    else window.sessionStorage.setItem(clavePruebas, String(simulacion));
  } catch {
    // The simulation is still available for this visit.
  }
  for (const listener of listeners) listener();
}

export function useRacha(events: readonly ProgressEvent[]) {
  const [fecha, setFecha] = useState(() => new Date());
  const diasSimulados = useSyncExternalStore(suscribirSimulacion, leerSimulacion);

  useEffect(() => {
    let timer: number;
    const revisar = () => {
      window.clearTimeout(timer);
      const ahora = new Date();
      setFecha(ahora);
      const medianoche = new Date(ahora);
      medianoche.setHours(24, 0, 0, 0);
      timer = window.setTimeout(revisar, medianoche.getTime() - ahora.getTime());
    };
    revisar();
    window.addEventListener('focus', revisar);
    document.addEventListener('visibilitychange', revisar);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', revisar);
      document.removeEventListener('visibilitychange', revisar);
    };
  }, []);

  return { ...calcularRacha(events, fecha), diasSimulados };
}
