import { estructuras } from '../../content/anatomy/catalogo';
import { anotaciones } from '../../content/anotaciones/anatomia';
import type { PreguntaReto, TipoReto } from '../../content/types';

const clave = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
const regiones = new Map(estructuras.map(estructura => [estructura.id, estructura]));
const notas = new Map(anotaciones.map(nota => [nota.id, nota]));
const terminos = new Map<string, Set<string>>();

for (const estructura of estructuras) {
  for (const { nombreEs, terminoEn } of [estructura, ...estructura.partes]) {
    const nombre = clave(nombreEs);
    const equivalentes = terminos.get(nombre) ?? new Set<string>();
    equivalentes.add(terminoEn);
    terminos.set(nombre, equivalentes);
  }
}

export function tituloPareja(pregunta: PreguntaReto) {
  const respuesta = pregunta.respuestas.find(opcion => opcion.id === pregunta.correctaId);
  const nota = respuesta?.anotacionId ? notas.get(respuesta.anotacionId) : undefined;
  const estructura = regiones.get(pregunta.estructuraId);
  return { texto: nota?.etiquetaEs ?? estructura?.nombreEs ?? pregunta.estructuraId,
    terminoEn: nota?.etiquetaEn ?? estructura?.terminoEn };
}

export function consignaPronunciable(pregunta: PreguntaReto, tipo: TipoReto) {
  if (tipo === 'senala-estructura') {
    const separador = pregunta.enunciado.lastIndexOf(' · ');
    if (separador !== -1) return {
      texto: pregunta.enunciado.slice(0, separador),
      terminoEn: pregunta.enunciado.slice(separador + 3),
    };
  }
  return {
    texto: pregunta.enunciado,
    terminoEn: tipo === 'relaciona-funcion' ? tituloPareja(pregunta).terminoEn : undefined,
  };
}

export function terminoRespuesta(estructuraId: string, texto: string) {
  const nombre = clave(texto);
  const estructura = regiones.get(estructuraId);
  const parte = estructura?.partes.find(item => clave(item.nombreEs) === nombre);
  if (parte) return parte.terminoEn;
  // El reto del antebrazo también usa la forma «Ulna».
  if (nombre === 'ulna') return regiones.get('ulna')?.terminoEn;
  const equivalentes = terminos.get(nombre);
  if (equivalentes?.size === 1) return [...equivalentes][0];
}
