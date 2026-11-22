import { describe, expect, it } from 'vitest';
import {
  applyOrderingHint,
  buildCaseSession,
  createInterviewExchange,
  discardIncorrectChoice,
  getInterviewChoices,
  moveItem,
  performanceLevel,
  scoreMultipleChoice,
  scoreOrderedActions,
  validateInterviewGraph,
} from '../src/features/casos/clinicalEngine';
import type { InterviewCase, InterviewNode } from '../src/content/casos/sessionTypes';
import { clinicalCases } from '../src/content/casos/session';

const node: InterviewNode = {
  id: 'onset',
  promptEn: 'When did the pain start?',
  promptEs: '¿Cuándo empezó el dolor?',
  patientEn: 'It started yesterday at midnight.',
  patientEs: 'Empezó ayer a medianoche.',
  recallPromptEn: 'When did the pain start?',
  recallPromptEs: '¿Cuándo empezó el dolor?',
  recallCorrectId: 'yesterday',
  recallOptions: [
    { id: 'yesterday', textEn: 'Yesterday at midnight', textEs: 'Ayer a medianoche' },
    { id: 'weeks', textEn: 'Three weeks ago', textEs: 'Hace tres semanas' },
    { id: 'unknown', textEn: 'The patient cannot remember', textEs: 'El paciente no lo recuerda' },
  ],
};

function countPaths(item: InterviewCase, path: readonly string[] = []): number {
  const choices = getInterviewChoices(item, path);
  if (path.length === 2) return choices.length;
  return choices.reduce((total, choice) => total + countPaths(item, [...path, choice.id]), 0);
}

describe('sesión de casos clínicos', () => {
  it('ofrece dos entrevistas, dos secuencias y una selección múltiple en inglés', () => {
    expect(clinicalCases).toHaveLength(5);
    expect(clinicalCases.filter(item => item.kind === 'interview')).toHaveLength(2);
    expect(clinicalCases.filter(item => item.kind === 'ordering')).toHaveLength(2);
    expect(clinicalCases.filter(item => item.kind === 'multiple-choice')).toHaveLength(1);
    expect(new Set(clinicalCases.map(item => item.id)).size).toBe(5);

    for (const item of clinicalCases) {
      expect(item.revision.estado).toBe('provisional');
      expect(item.revision.fuentes.length).toBeGreaterThan(0);
      if (item.kind === 'interview') {
        expect(validateInterviewGraph(item)).toEqual({ valid: true, pathCount: 27, errors: [] });
        expect(countPaths(item)).toBe(27);
        expect(getInterviewChoices(item, [])).toHaveLength(3);
        expect(item.nodes.every(question => question.promptEs && question.patientEs)).toBe(true);
      }
    }
  });

  it('prepara cinco casos sin repetir y no modifica el catálogo', () => {
    const ids = ['knee', 'ankle', 'abcde', 'seizure', 'allergy'];
    const original = [...ids];

    const session = buildCaseSession(ids, () => 0);

    expect(session).toHaveLength(5);
    expect(new Set(session)).toEqual(new Set(ids));
    expect(ids).toEqual(original);
  });

  it('convierte la respuesta escuchada en una pregunta de comprensión con tres opciones únicas', () => {
    const exchange = createInterviewExchange(node, () => 0);

    expect(exchange.response.patientEn).toBe('It started yesterday at midnight.');
    expect(exchange.response.patientEs).toBe('Empezó ayer a medianoche.');
    expect(exchange.recall.correctId).toBe('yesterday');
    expect(exchange.recall.options).toHaveLength(3);
    expect(new Set(exchange.recall.options.map(option => option.id)).size).toBe(3);
    expect(exchange.recall.promptEs).toBe('¿Cuándo empezó el dolor?');
    expect(exchange.recall.options).toContainEqual({
      id: 'yesterday',
      textEn: 'Yesterday at midnight',
      textEs: 'Ayer a medianoche',
    });
  });

  it('solo ofrece continuaciones declaradas por la respuesta anterior', () => {
    const interview = clinicalCases.find((item): item is InterviewCase => item.kind === 'interview');
    expect(interview).toBeDefined();
    if (!interview) return;

    const first = getInterviewChoices(interview, []);
    const chosen = first[0];
    const second = getInterviewChoices(interview, [chosen.id]);

    expect(second.map(question => question.id)).toEqual(chosen.nextIds);
    expect(second).toHaveLength(3);
    expect(getInterviewChoices(interview, ['missing-node'])).toEqual([]);
  });

  it('asigna colores de desempeño según el porcentaje real', () => {
    expect(performanceLevel({ correct: 3, errors: 0 })).toBe('strong');
    expect(performanceLevel({ correct: 2, errors: 1 })).toBe('partial');
    expect(performanceLevel({ correct: 1, errors: 2 })).toBe('review');
    expect(performanceLevel({ correct: 0, errors: 0 })).toBe('review');
  });

  it('califica el orden completo sin aceptar una permutación parcial', () => {
    const correct = ['airway', 'breathing', 'circulation', 'disability', 'exposure'];

    expect(scoreOrderedActions(correct, correct)).toEqual({ correct: 5, errors: 0, assisted: 0, hints: 0, complete: true });
    expect(scoreOrderedActions(['airway', 'circulation'], correct)).toEqual({ correct: 1, errors: 1, assisted: 0, hints: 0, complete: false });
  });

  it('mueve una tarjeta sin modificar ni duplicar la lista original', () => {
    const original = ['b', 'c', 'a', 'd'];

    expect(moveItem(original, 2, 0)).toEqual(['a', 'b', 'c', 'd']);
    expect(original).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(original, -1, 2)).toEqual(original);
  });

  it('coloca una pista en su posición correcta y conserva cada acción una vez', () => {
    const expected = ['a', 'b', 'c', 'd', 'e'];
    const result = applyOrderingHint(['c', 'b', 'e', 'a', 'd'], expected, []);

    expect(result.order[0]).toBe('a');
    expect(result.lockedIds).toEqual(['a']);
    expect(result.hintedId).toBe('a');
    expect(new Set(result.order)).toEqual(new Set(expected));
    expect(result.order).toHaveLength(expected.length);
  });

  it('limita las pistas de orden a tres y deja una acción en casos de dos pasos', () => {
    const expected = ['a', 'b', 'c', 'd', 'e'];
    let order = ['e', 'd', 'c', 'b', 'a'];
    let locked: string[] = [];
    for (let index = 0; index < 4; index += 1) {
      const result = applyOrderingHint(order, expected, locked);
      order = result.order;
      locked = result.lockedIds;
    }
    expect(locked).toHaveLength(3);

    const short = applyOrderingHint(['b', 'a'], ['a', 'b'], []);
    const shortAgain = applyOrderingHint(short.order, ['a', 'b'], short.lockedIds);
    expect(short.lockedIds).toHaveLength(1);
    expect(shortAgain.lockedIds).toEqual(short.lockedIds);
  });

  it('separa las posiciones resueltas de las colocadas mediante pistas', () => {
    const result = scoreOrderedActions(['a', 'b', 'c', 'd'], ['a', 'b', 'c', 'd'], ['a', 'b']);

    expect(result).toEqual({ correct: 2, assisted: 2, errors: 0, hints: 2, complete: true });
    expect(performanceLevel(result)).toBe('partial');
  });

  it('califica una selección usando el identificador correcto', () => {
    expect(scoreMultipleChoice('adrenaline', 'adrenaline')).toEqual({ correct: 1, errors: 0 });
    expect(scoreMultipleChoice('antibiotic', 'adrenaline')).toEqual({ correct: 0, errors: 1 });
  });

  it('descarta exactamente una opción incorrecta sin eliminar la correcta', () => {
    const options = [
      { id: 'correct', textEn: 'Correct' },
      { id: 'wrong-a', textEn: 'Wrong A' },
      { id: 'wrong-b', textEn: 'Wrong B' },
    ] as const;

    expect(discardIncorrectChoice(options, 'correct', undefined, () => 0)).toBe('wrong-a');
    expect(discardIncorrectChoice(options, 'correct', undefined, () => .99)).toBe('wrong-b');
  });

  it('conserva la opción ya elegida y no inventa un descarte cuando no queda candidato', () => {
    const options = [
      { id: 'correct', textEn: 'Correct' },
      { id: 'wrong-a', textEn: 'Wrong A' },
      { id: 'wrong-b', textEn: 'Wrong B' },
    ] as const;

    expect(discardIncorrectChoice(options, 'correct', 'wrong-a', () => 0)).toBe('wrong-b');
    expect(discardIncorrectChoice(options.slice(0, 2), 'correct', 'wrong-a', () => 0)).toBeUndefined();
  });
});
