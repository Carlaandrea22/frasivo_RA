import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  applyOrderingHint,
  buildCaseSession,
  buildMixedCaseSession,
  casesForTopic,
  createInterviewExchange,
  discardIncorrectChoice,
  getInterviewChoices,
  isPerfectWithoutHints,
  moveItem,
  performanceLevel,
  scoreInvestigation,
  scoreMultipleChoice,
  scoreOrderedActions,
  validateInterviewGraph,
} from '../src/features/casos/clinicalEngine';
import type { InterviewCase, InterviewNode } from '../src/content/casos/sessionTypes';
import { clinicalCases } from '../src/content/casos/session';
import { resolveCaseAnatomy } from '../src/content/casos/caseAnatomy';

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
  it('ofrece cuatro casos por modo, con conversaciones bilingües', () => {
    expect(clinicalCases).toHaveLength(19);
    for (const kind of ['interview', 'investigation', 'ordering', 'multiple-choice']) {
      expect(clinicalCases.filter(item => item.kind === kind)).toHaveLength(4);
    }
    expect(new Set(clinicalCases.map(item => item.id)).size).toBe(clinicalCases.length);

    for (const item of clinicalCases) {
      expect(item.revision.estado).toBe('provisional');
      expect(item.revision.fuentes.length).toBeGreaterThan(0);
      if (item.kind === 'interview') {
        expect(validateInterviewGraph(item)).toEqual({ valid: true, pathCount: 27, errors: [] });
        expect(countPaths(item)).toBe(27);
        expect(getInterviewChoices(item, [])).toHaveLength(3);
        expect(item.nodes.every(question => question.promptEs && question.patientEs)).toBe(true);
      }
      if (item.kind === 'interview' || item.kind === 'investigation') {
        expect(item.openingEs && item.openingEn).toBeTruthy();
      }
      if (item.kind === 'multiple-choice') {
        expect(item.options.filter(option => option.id === item.correctId)).toHaveLength(1);
        expect(item.scenarioEs && item.promptEs && item.explanationEs).toBeTruthy();
        expect(item.options.every(option => option.textEs && option.textEn)).toBe(true);
      }
      if (item.kind === 'ordering') {
        expect(new Set(item.actions.map(action => action.id)).size).toBe(item.actions.length);
        expect(item.scenarioEs && item.explanationEs).toBeTruthy();
        expect(item.actions.every(action => action.textEs && action.textEn)).toBe(true);
      }
    }
  });

  it('ofrece tableros bilingües con una causa distinta para cada paciente', () => {
    const matching = clinicalCases.filter(item => item.kind === 'matching');
    expect(matching).toHaveLength(3);
    for (const item of matching) {
      expect(new Set(item.patients.map(patient => patient.correctId))).toEqual(new Set(item.causes.map(cause => cause.id)));
      expect(new Set(item.patients.map(patient => patient.id)).size).toBe(3);
      expect(item.patients.every(patient => patient.textEs && patient.textEn && patient.explanationEs && patient.explanationEn)).toBe(true);
    }
  });

  it('incluye los cinco modos dentro de cada sesión mixta de cinco casos', () => {
    const selections = new Set<string>();
    for (const seed of [0, .25, .5, .75, .99]) {
      const ids = buildMixedCaseSession(clinicalCases, () => seed);
      expect(new Set(ids).size).toBe(5);
      const kinds = clinicalCases.filter(item => ids.includes(item.id)).map(item => item.kind);
      expect(new Set(kinds)).toEqual(new Set(['interview', 'investigation', 'ordering', 'multiple-choice', 'matching']));
      selections.add([...ids].sort().join('|'));
    }
    expect(selections.size).toBeGreaterThan(1);
  });

  it('permite diez casos mixtos distintos y conserva la variedad de tipos', () => {
    const ids = buildMixedCaseSession(clinicalCases, () => .99, 10);
    expect(new Set(ids).size).toBe(10);
    const kinds = clinicalCases.filter(item => ids.includes(item.id)).map(item => item.kind);
    expect(new Set(kinds).size).toBe(5);
  });

  it('elige la categoría a partir de referencias del atlas y conserva todos los casos en Aleatorio', () => {
    const investigations = clinicalCases.filter(item => item.kind === 'investigation');
    expect(casesForTopic(investigations, 'huesos').map(item => item.id))
      .toEqual(['headache-investigation', 'shin-investigation']);
    expect(casesForTopic(investigations, 'organos').map(item => item.id))
      .toEqual(['abdominal-investigation', 'headache-investigation', 'breathing-investigation']);
    expect(casesForTopic(clinicalCases, 'aleatorio')).toHaveLength(clinicalCases.length);
  });

  it('vincula cada investigación a una parte del modelo y conserva la mandíbula del cráneo', () => {
    for (const item of clinicalCases) {
      if (item.kind !== 'investigation') continue;
      for (const region of item.anatomy) {
        const anatomy = resolveCaseAnatomy(region);
        if (!anatomy) throw new Error(`Anatomía sin resolver: ${region.structureId}/${region.partId}`);
        const bytes = readFileSync(new URL(`../src/content/anatomy/modelos/fichas/explorar-${anatomy.model.assetId}.glb`, import.meta.url));
        const { nodes } = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12))) as {
          nodes: { name: string; children?: number[]; mesh?: number }[];
        };
        const root = nodes.find(node => node.name === anatomy.model.nodeId);
        const children = root?.children?.map(index => nodes[index]) ?? [];
        expect(root).toBeDefined();
        expect(anatomy.image).toContain('.webp');
        expect(anatomy.anchor.point.every(Number.isFinite)).toBe(true);
        if (anatomy.selectedNodeId) expect(children).toContainEqual(expect.objectContaining({ name: anatomy.selectedNodeId, mesh: expect.any(Number) }));
        if (region.structureId === 'skull') expect(children).toContainEqual(expect.objectContaining({ name: 'skull__mandibula', mesh: expect.any(Number) }));
      }
    }
  });

  it('ofrece 27 rutas y da el punto completo por la hipótesis correcta', () => {
    for (const item of clinicalCases) {
      if (item.kind !== 'investigation') continue;
      expect(validateInterviewGraph(item)).toEqual({ valid: true, pathCount: 27, errors: [] });
      const scores = getInterviewChoices(item, []).flatMap(first =>
        getInterviewChoices(item, [first.id]).flatMap(second =>
          getInterviewChoices(item, [first.id, second.id]).map(third =>
            scoreInvestigation(item, [first.id, second.id, third.id], item.preferredHypothesisId))));
      expect(scores).toHaveLength(27);
      expect(scores.some(score => score.findings.length === 0)).toBe(true);
      expect(scores.every(score => score.correct === 1 && score.errors === 0)).toBe(true);
      const incorrect = item.hypotheses.find(option => option.id !== item.preferredHypothesisId)!;
      expect(scoreInvestigation(item, item.nodes.map(node => node.id), incorrect.id)).toMatchObject({
        correct: 0, errors: 1, findings: item.findings,
      });
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

  it('elige una posición incorrecta, la intercambia y conserva cada acción una vez', () => {
    const expected = ['a', 'b', 'c', 'd', 'e'];
    const result = applyOrderingHint(['c', 'b', 'e', 'a', 'd'], expected, [], () => .99);

    expect(result.order).toEqual(['c', 'b', 'd', 'a', 'e']);
    expect(result.lockedIds).toEqual(['e']);
    expect(result.hintedId).toBe('e');
    expect(new Set(result.order)).toEqual(new Set(expected));
    expect(result.order).toHaveLength(expected.length);
  });

  it('limita las pistas de orden a tres y deja una acción en casos de dos pasos', () => {
    const expected = ['a', 'b', 'c', 'd', 'e'];
    let order = ['b', 'c', 'd', 'e', 'a'];
    let locked: string[] = [];
    for (let index = 0; index < 4; index += 1) {
      const result = applyOrderingHint(order, expected, locked, () => 0);
      order = result.order;
      locked = result.lockedIds;
    }
    expect(locked).toHaveLength(3);

    const short = applyOrderingHint(['b', 'a'], ['a', 'b'], [], () => 0);
    const shortAgain = applyOrderingHint(short.order, ['a', 'b'], short.lockedIds, () => 0);
    expect(short.lockedIds).toHaveLength(1);
    expect(shortAgain.lockedIds).toEqual(short.lockedIds);
  });

  it('una pista nueva conserva la posición absoluta de las tarjetas ya bloqueadas', () => {
    const expected = ['a', 'b', 'c', 'd', 'e'];

    const result = applyOrderingHint(['d', 'b', 'a', 'c', 'e'], expected, ['b'], () => 0);

    expect(result.order).toEqual(['a', 'b', 'd', 'c', 'e']);
    expect(result.lockedIds).toEqual(['b', 'a']);
    expect(result.order[expected.indexOf('b')]).toBe('b');
    expect(new Set(result.order)).toEqual(new Set(expected));
  });

  it('permite usar las tres pistas sin revelar que las tarjetas ya están bien ordenadas', () => {
    const expected = ['a', 'b', 'c', 'd', 'e'];
    const result = applyOrderingHint(expected, expected, ['a', 'c'], () => .99);

    expect(result.order).toEqual(expected);
    expect(result.lockedIds).toEqual(['a', 'c', 'e']);
  });

  it('registra las posiciones con pista por separado y las cuenta para el nivel de desempeño', () => {
    const expected = ['a', 'b', 'c', 'd', 'e'];
    const result = scoreOrderedActions(expected, expected, ['a', 'b', 'c']);

    expect(result).toEqual({ correct: 2, assisted: 3, errors: 0, hints: 3, complete: true });
    expect(performanceLevel(result)).toBe('strong');
    expect(performanceLevel(scoreOrderedActions(['a', 'b', 'c', 'e', 'd'], expected, ['a', 'b', 'c']))).toBe('partial');
  });

  it('reserva la celebración para una práctica perfecta sin pistas', () => {
    expect(isPerfectWithoutHints({ correct: 3, errors: 0 })).toBe(true);
    expect(isPerfectWithoutHints({ correct: 1, errors: 0, hints: 1 })).toBe(false);
    expect(isPerfectWithoutHints({ correct: 2, errors: 0, assisted: 3 })).toBe(false);
    expect(isPerfectWithoutHints({ correct: 0, errors: 0 })).toBe(false);
    expect(isPerfectWithoutHints({ correct: 4, errors: 1 })).toBe(false);
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
