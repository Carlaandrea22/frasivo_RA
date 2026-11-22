import { useSyncExternalStore } from 'react';
import { Mascota, type MascotaAnimacion } from '../../features/progreso/mascota/Mascota';
import { obtenerEvolucion } from '../../features/progreso/mascota/evolucion';
import { getProgress, subscribeProgress } from '../progreso';
import { useRacha } from '../progreso/useRacha';
import type { PerformanceLevel } from './scoring';

const reactions = { strong: 'celebracion', partial: 'reposo', review: 'triste' } satisfies Record<PerformanceLevel, MascotaAnimacion>;

export function EvaluationMascot({ level }: { level: PerformanceLevel }) {
  const { events } = useSyncExternalStore(subscribeProgress, getProgress);
  const { dias } = useRacha(events);
  const { actual } = obtenerEvolucion(dias);

  return <Mascota className="evaluation-summary-mascot" etapa={actual.id} animacion={reactions[level]}/>;
}
