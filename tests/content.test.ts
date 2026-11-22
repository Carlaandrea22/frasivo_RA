import { describe, expect, it } from 'vitest';
import { estructuras } from '../src/content/anatomy/catalogo';
import { anotaciones } from '../src/content/anotaciones/anatomia';
import { casos } from '../src/content/casos/rodilla';
import { retos } from '../src/content/ejercicios/retos';
import { resolveRoute, type RouteDefinition } from '../src/shared/navegacion';

describe('contratos de las muestras de LumAR', () => {
  it('vincula el reto, las partes anatómicas y sus anclajes', () => {
    const femur = estructuras[0];
    const femurNotes = anotaciones.filter(note => note.estructuraId === femur.id);
    expect(femurNotes.map(note => note.parteId)).toEqual(femur.partes.map(part => part.id));
    expect(femurNotes.every(note => note.nodeId === femur.modelo?.nodeId)).toBe(true);
    expect(retos[0].preguntas[0].estructuraId).toBe(femur.id);
    expect(retos[0].preguntas[0].respuestas.filter(option => option.id === retos[0].preguntas[0].correctaId)).toHaveLength(1);
    for (const item of [...estructuras, ...anotaciones, ...retos, ...casos]) {
      expect(item.revision.estado).toBe('provisional');
      expect(item.revision.fuentes.length).toBeGreaterThan(0);
    }
  });

  it('el caso permite 27 entrevistas de tres turnos sin repetir una pregunta', () => {
    const caso = casos[0];
    expect(caso.primerTurno).toHaveLength(3);
    expect(caso.hipotesis.alternativas).toHaveLength(2);
    const paths = new Set<string>();
    const questions = new Set<string>();
    for (const first of caso.primerTurno) {
      expect(first.siguiente).toHaveLength(3);
      for (const second of first.siguiente) {
        expect(second.siguiente).toHaveLength(3);
        for (const third of second.siguiente) {
          const ids = [first, second, third].map(turn => turn.id);
          ids.forEach(id => questions.add(id));
          expect(new Set(ids).size).toBe(3);
          expect([first, second, third].every(turn => turn.respuesta && turn.aporte)).toBe(true);
          paths.add(ids.join('/'));
        }
      }
    }
    expect(paths.size).toBe(27);
    expect(caso.preguntasTutor.some(prompt => !prompt.cuando)).toBe(true);
    for (const { cuando } of caso.preguntasTutor) {
      if (cuando?.preguntaOmitidaId) expect(questions.has(cuando.preguntaOmitidaId)).toBe(true);
      if (cuando?.hipotesisId) {
        expect([caso.hipotesis.correcta, ...caso.hipotesis.alternativas].some(option => option.id === cuando.hipotesisId)).toBe(true);
      }
    }
  });
});

describe('rutas por hash', () => {
  const Screen = () => null;
  const routes: RouteDefinition[] = [
    { path: 'cuerpo', tab: 'cuerpo', Screen },
    { path: 'progreso/creditos', tab: 'progreso', Screen },
    { path: 'explorar/estructura/:id', tab: 'explorar', Screen },
  ];

  it('admite enlaces históricos, parámetros codificados y una página no disponible', () => {
    expect(resolveRoute(routes, '')?.route.path).toBe('cuerpo');
    expect(resolveRoute(routes, '#creditos')?.route.path).toBe('progreso/creditos');
    expect(resolveRoute(routes, '#explorar/estructura/f%C3%A9mur')?.params).toEqual({ id: 'fémur' });
    expect(resolveRoute(routes, '#explorar/estructura/%FF')).toBeNull();
    expect(resolveRoute(routes, '#desconocida')).toBeNull();
  });
});
