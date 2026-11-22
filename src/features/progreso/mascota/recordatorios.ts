import { diaLocal } from '../../../shared/progreso/racha';
import type { MascotaEtapa } from './evolucion';

export const horasDeRecordatorio = [12, 20, 24] as const;
export type FranjaRecordatorio = 'mediodia' | 'noche';

export function turnoDeRecordatorio(fecha: Date) {
  const hora = fecha.getHours();
  if (hora < horasDeRecordatorio[0]) return null;
  const franja: FranjaRecordatorio = hora < horasDeRecordatorio[1] ? 'mediodia' : 'noche';
  return { franja, dia: diaLocal(fecha) };
}

export const mensajesDeRacha: Record<MascotaEtapa, Record<FranjaRecordatorio, string>> = {
  bebe: {
    mediodia: '¡Oye, hermano mayor! ¿Me ayudas a cuidar nuestra racha?',
    noche: 'Antes de dormir, ¿hacemos un ratito de práctica juntos?',
  },
  nino: {
    mediodia: '¡Te reto a completar la práctica de hoy! ¿Te animas?',
    noche: '¡Todavía hay tiempo! Vamos a cerrar el día con la racha lista.',
  },
  adolescente: {
    mediodia: 'Ven, estudiemos juntos. ¿Hacemos los casos que faltan?',
    noche: 'Me queda un rato para estudiar. ¿Terminamos la práctica de hoy?',
  },
  medico_joven: {
    mediodia: 'Tengo un descanso antes de la ronda. ¿Practicamos unos casos?',
    noche: 'Antes de cerrar el turno, repasemos los casos que faltan.',
  },
  medico_veterano: {
    mediodia: 'Una buena costumbre se practica a diario. Hagamos juntos los casos de hoy.',
    noche: 'Aún nos queda tiempo para un último repaso. ¿Te acompaño?',
  },
};
