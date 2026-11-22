import type { ProgressEvent } from './index';

export const metaDiaria = 5;

function diaLocal(fecha: Date) {
  // UTC here gives a consecutive index to the device's calendar dates, even at DST.
  return Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()) / 86_400_000;
}

export function calcularRacha(events: readonly ProgressEvent[], ahora: Date) {
  const hoy = diaLocal(ahora);
  const completados = new Map<number, number>();
  for (const event of events) {
    if (event.kind !== 'practice' || event.groupId !== 'clinical-cases') continue;
    const dia = diaLocal(new Date(event.timestamp));
    completados.set(dia, (completados.get(dia) ?? 0) + 1);
  }

  const completadosHoy = completados.get(hoy) ?? 0;
  let dia = completadosHoy >= metaDiaria ? hoy : hoy - 1;
  let dias = 0;
  while ((completados.get(dia) ?? 0) >= metaDiaria) {
    dias += 1;
    dia -= 1;
  }
  return { dias, completadosHoy };
}
