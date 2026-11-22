import { estructuras } from '../../content/anatomy/catalogo';
import { retoTypeLabels, type ModoReto, type PreguntaReto, type Reto } from '../../content/types';
import { getProgress, recordDemonstration, recordPractice, type PracticeEvent } from '../../shared/progreso';

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
  quick?: boolean;
}

const claves = 'lumar.retos:resultado:v1:';
const memoria = new Map<string,string>();
export const rutaRetos = '#practicar/retos';
export const rutaReto = (id: string) => `${rutaRetos}/${id}`;
export const rutaResultado = (reto: string, intento: string) => `${rutaReto(reto)}/resultado/${encodeURIComponent(intento)}`;
export const rutaFicha = (id: string) => `#explorar/estructura/${id}`;
export const nombreEstructura = (id: string) => estructuras.find(item => item.id === id)?.nombreEs ?? id;
export const tituloRetoParaEstructura = (reto: Reto, id: string) => `${retoTypeLabels[reto.tipo]} · ${nombreEstructura(id)}`;

export function modeloDelResultado(reto: Reto, registro: PracticeEvent) {
  return (reto.tipo === 'ubica-partes' || reto.tipo === 'senala-estructura') &&
    registro.correct + registro.errors < reto.preguntas.length &&
    reto.preguntas.some(pregunta => pregunta.estructuraId === registro.itemId) ? registro.itemId : undefined;
}

export function tituloResultadoReto(reto: Reto, registro: PracticeEvent) {
  if (registro.quick) return tituloRetoParaEstructura(reto, registro.itemId);
  const modeloId = modeloDelResultado(reto, registro);
  return modeloId && reto.estructurasRelacionadas.length > 1
    ? tituloRetoParaEstructura(reto, modeloId) : reto.titulo;
}

export function asignar(respuestas: Respuestas, pregunta: string, opcion: string): Respuestas {
  // A label or function can be in only one slot, even when it is moved directly.
  const entradas = Object.entries(respuestas).filter(([id, value]) => id !== pregunta && value !== opcion);
  return Object.fromEntries([...entradas, [pregunta, opcion]]);
}

export function emparejar(respuestas: Respuestas, pregunta: string, opcion: string): Respuestas {
  const otra = Object.keys(respuestas).find(id => id !== pregunta && respuestas[id] === opcion);
  const anterior = respuestas[pregunta];
  return otra && anterior
    ? { ...respuestas, [pregunta]: opcion, [otra]: anterior }
    : asignar(respuestas, pregunta, opcion);
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

export function puntuarCorrecciones(correcciones: readonly Correccion[]) {
  const correct = correcciones.filter(row => row.acierto).length;
  return { correct, errors: correcciones.length - correct };
}

export function guardarResultado(reto: Reto, resultado: Resultado) {
  const estructura = estructuras.find(item => item.id === reto.estructurasRelacionadas[0]);
  const target = { areaId: 'anatomy', groupId: estructura?.categoria, itemId: estructura?.id ?? reto.id, activityId: reto.id };
  const intento = recordPractice({
    ...target, ...puntuarCorrecciones(resultado.correcciones), hints: resultado.totalPistas,
    retried: resultado.correcciones.some(row => row.erroresPrevios.length > 0),
    quick: resultado.quick,
    context: { kind: 'reto', mode: resultado.modo },
  });
  const key = claves + intento.id;
  const value = JSON.stringify(resultado.correcciones);
  try { localStorage.setItem(key, value); } catch { memoria.set(key, value); }
  if (resultado.modo === 'evaluacion' && !resultado.quick) recordDemonstration({ ...target, practiceEventId: intento.id });
  return intento;
}

export function ultimoIntento(reto: Reto) {
  return getProgress().events.filter(event => event.kind === 'practice' && event.context?.kind === 'reto' &&
    event.activityId === reto.id).at(-1);
}

function leerCorrecciones(reto: Reto, id: string): Correccion[] {
  const key = claves + id;
  let raw = memoria.get(key);
  try { raw = localStorage.getItem(key) ?? raw; } catch { /* Use the in-memory copy if storage is unavailable. */ }
  if (!raw) return [];
  try {
    const rows: unknown = JSON.parse(raw);
    if (!Array.isArray(rows)) return [];
    return rows.filter((row): row is Correccion =>
      row && reto.preguntas.some(p => p.id === row.preguntaId && p.respuestas.some(r => r.id === row.respuestaId))
      && typeof row.acierto === 'boolean' && Array.isArray(row.erroresPrevios)
      && row.erroresPrevios.every((answer: unknown) => typeof answer === 'string'));
  } catch { return []; }
}

export function retoTuvoReintentos(reto: Reto, registro: PracticeEvent) {
  return registro.retried ?? (registro.context?.kind === 'reto' && registro.context.mode === 'entrenamiento' &&
    leerCorrecciones(reto, registro.id).some(row => row.erroresPrevios.length > 0));
}

export function leerResultado(reto: Reto, id: string) {
  const registro = getProgress().events.find(event => event.kind === 'practice' && event.context?.kind === 'reto' &&
    event.activityId === reto.id && event.id === id);
  if (registro?.kind !== 'practice' || registro.context?.kind !== 'reto') return;
  return { registro, correcciones: leerCorrecciones(reto, id), modo: registro.context.mode };
}
