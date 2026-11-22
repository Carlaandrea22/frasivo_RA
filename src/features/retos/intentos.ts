import { estructuras } from '../../content/anatomy/catalogo';
import type { ModoReto, PreguntaReto, Reto } from '../../content/types';
import { getProgress, recordDemonstration, recordPractice } from '../../shared/progreso';

export type Respuestas = Readonly<Record<string, string>>;
export interface Correccion {
  preguntaId: string;
  respuestaId: string;
  acierto: boolean;
  erroresPrevios: readonly string[];
}

interface Resultado {
  modo: ModoReto;
  totalPistas: number;
  correcciones: readonly Correccion[];
}

const claves = 'lumar.retos:resultado:v1:';
const memoria = new Map<string,string>();
export const rutaRetos = '#practicar/retos';
export const rutaReto = (id: string) => `${rutaRetos}/${id}`;
export const rutaResultado = (reto: string, intento: string) => `${rutaReto(reto)}/resultado/${encodeURIComponent(intento)}`;
export const rutaFicha = (id: string) => `#explorar/estructura/${id}`;
export const nombreEstructura = (id: string) => estructuras.find(item => item.id === id)?.nombreEs ?? id;

export function asignar(respuestas: Respuestas, pregunta: string, opcion: string): Respuestas {
  // A label or function can be in only one slot, even when it is moved directly.
  const entradas = Object.entries(respuestas).filter(([id, value]) => id !== pregunta && value !== opcion);
  return Object.fromEntries([...entradas, [pregunta, opcion]]);
}

export function corregir(preguntas: readonly PreguntaReto[], respuestas: Respuestas, previos: Readonly<Record<string, readonly string[]>>): Correccion[] {
  return preguntas.map(pregunta => ({
    preguntaId: pregunta.id,
    respuestaId: respuestas[pregunta.id],
    acierto: respuestas[pregunta.id] === pregunta.correctaId,
    erroresPrevios: previos[pregunta.id] ?? [],
  }));
}

export function explicacion(pregunta: PreguntaReto, opcion: string) {
  return pregunta.respuestas.find(item => item.id === opcion)?.feedbackError ?? pregunta.feedbackError;
}

export function guardarResultado(reto: Reto, resultado: Resultado) {
  const correct = resultado.correcciones.filter(row => row.acierto).length;
  const estructura = estructuras.find(item => item.id === reto.estructurasRelacionadas[0]);
  const target = { areaId: 'anatomy', groupId: estructura?.categoria, itemId: estructura?.id ?? reto.id, activityId: reto.id };
  const intento = recordPractice({
    ...target, correct, errors: resultado.correcciones.length - correct, hints: resultado.totalPistas,
    context: { kind: 'reto', mode: resultado.modo },
  });
  const key = claves + intento.id;
  const value = JSON.stringify(resultado.correcciones);
  try { localStorage.setItem(key, value); } catch { memoria.set(key, value); }
  if (resultado.modo === 'evaluacion') recordDemonstration({ ...target, practiceEventId: intento.id });
  return rutaResultado(reto.id, intento.id);
}

export function ultimoIntento(reto: Reto) {
  return getProgress().events.filter(event => event.kind === 'practice' && event.context?.kind === 'reto' &&
    event.activityId === reto.id).at(-1);
}

export function leerResultado(reto: Reto, id: string) {
  const registro = getProgress().events.find(event => event.kind === 'practice' && event.context?.kind === 'reto' &&
    event.activityId === reto.id && event.id === id);
  if (registro?.kind !== 'practice' || registro.context?.kind !== 'reto') return;
  let correcciones: Correccion[] = [];
  try {
    const key = claves + id;
    const rows: unknown = JSON.parse(localStorage.getItem(key) ?? memoria.get(key) ?? '[]');
    if (Array.isArray(rows)) correcciones = rows.filter((row): row is Correccion =>
      row && reto.preguntas.some(p => p.id === row.preguntaId && p.respuestas.some(r => r.id === row.respuestaId))
      && typeof row.acierto === 'boolean' && Array.isArray(row.erroresPrevios)
      && row.erroresPrevios.every((answer: unknown) => typeof answer === 'string'));
  } catch {
    const raw = memoria.get(claves + id);
    if (raw) correcciones = JSON.parse(raw);
  }
  return { registro, correcciones, modo: registro.context.mode };
}
