import { describe, expect, it } from 'vitest';
import type { PracticeEvent } from '../src/shared/progreso';
import { metaDiaria, calcularRacha } from '../src/shared/progreso/racha';
import { obtenerEvolucion } from '../src/features/progreso/mascota/evolucion';

function casos(fecha: Date, cantidad = metaDiaria, groupId = 'clinical-cases'): PracticeEvent[] {
  return Array.from({ length: cantidad }, (_, index) => ({
    id: `${fecha.toISOString()}-${index}`, kind: 'practice', timestamp: fecha.toISOString(),
    areaId: 'anatomy', groupId, itemId: 'case', correct: 0, errors: 3, hints: 0,
  }));
}

describe('racha diaria de casos clínicos', () => {
  it('suma un día al completar cinco casos, aunque siga practicando o responda mal', () => {
    const hoy = new Date(2026, 10, 22, 15);
    expect(calcularRacha(casos(hoy, 4), hoy)).toEqual({ dias: 0, completadosHoy: 4 });
    expect(calcularRacha(casos(hoy, 5), hoy)).toEqual({ dias: 1, completadosHoy: 5 });
    expect(calcularRacha(casos(hoy, 12), hoy)).toEqual({ dias: 1, completadosHoy: 12 });
    expect(calcularRacha(casos(hoy, 8, 'otro-grupo'), hoy).dias).toBe(0);
  });

  it('mantiene la racha de ayer durante hoy y la reinicia tras perder un día', () => {
    const hoy = new Date(2026, 10, 22, 23, 59);
    const historial = [...casos(new Date(2026, 10, 20, 12)), ...casos(new Date(2026, 10, 21, 12)), ...casos(hoy, 4)];
    expect(calcularRacha(historial, hoy)).toEqual({ dias: 2, completadosHoy: 4 });
    expect(calcularRacha(historial, new Date(2026, 10, 23, 0, 1))).toEqual({ dias: 0, completadosHoy: 0 });
    expect(calcularRacha([...historial, ...casos(new Date(2026, 10, 23, 9))], new Date(2026, 10, 23, 12)).dias).toBe(1);
  });

  it('separa los casos por la medianoche local aunque compartan fecha UTC', () => {
    const ayer = new Date(2026, 10, 21, 23, 55);
    const hoy = new Date(2026, 10, 22, 0, 5);
    const historial = [...casos(ayer), ...casos(hoy), ...casos(new Date(2026, 10, 24, 12))];
    expect(calcularRacha(historial, hoy)).toEqual({ dias: 2, completadosHoy: 5 });
  });

  it('evoluciona al alcanzar cada etapa de la racha', () => {
    expect([0, 1, 2, 3, 6, 7, 13, 14].map(dias => obtenerEvolucion(dias).actual.id)).toEqual([
      'bebe', 'nino', 'nino', 'adolescente', 'adolescente', 'medico_joven', 'medico_joven', 'medico_veterano',
    ]);
  });
});
