import { describe, expect, it } from 'vitest';
import { createClassroomMission, transitionMission, applyMissionProgress } from '../src/missions/classroom';
import { emptyProgress } from '../src/storage';

describe('misión de tres objetos', () => {
  it('ignora un segundo inicio para no reiniciar una búsqueda en curso', () => {
    const ready = createClassroomMission();
    const started = transitionMission(ready, { type: 'start', targets: ready.targets }).state;
    const duplicate = transitionMission(started, { type: 'start', targets: ['chair', 'mouse', 'keyboard'] });
    expect(duplicate.state).toBe(started);
    expect(duplicate.pointDelta).toBe(0);
  });
  it('exige tres objetivos distintos compatibles con el aula', () => {
    expect(() => createClassroomMission(['book', 'chair'])).toThrow();
    expect(() => createClassroomMission(['book', 'book', 'chair'])).toThrow();
    expect(() => createClassroomMission(['book', 'chair', 'banknote'])).toThrow();
    const m = createClassroomMission();
    expect(m.targets).toEqual(['book', 'chair', 'backpack']);
    expect(m.questions.map(q => q.type)).toEqual(['identify', 'complete', 'match']);
  });
  it('no entrega puntos por un objeto equivocado o una detección retenida', () => {
    const ready = createClassroomMission();
    const { state } = transitionMission(ready, { type: 'start', targets: ready.targets });
    const wrong = transitionMission(state, { type: 'select', wordId: 'chair', observed: true });
    expect(wrong.state.phase).toBe('finding');
    expect(wrong.state.notice).toBe('wrong-object');
    expect(wrong.pointDelta).toBe(0);
    const stale = transitionMission(state, { type: 'select', wordId: 'book', observed: false });
    expect(stale.state.phase).toBe('finding');
    expect(stale.state.notice).toBe('not-visible');
    expect(stale.pointDelta).toBe(0);
  });
  it('busca en orden y no duplica puntos por tocar dos veces', () => {
    let m = createClassroomMission();
    m = transitionMission(m, { type: 'start', targets: m.targets }).state;
    const found = transitionMission(m, { type: 'select', wordId: 'book', observed: true });
    expect(found.state.phase).toBe('found');
    expect(found.pointDelta).toBe(10);
    const duplicate = transitionMission(found.state, { type: 'select', wordId: 'book', observed: true });
    expect(duplicate.pointDelta).toBe(0);
    expect(duplicate.state.points).toBe(10);
    const next = transitionMission(found.state, { type: 'next' });
    expect(next.state.index).toBe(1);
    expect(next.state.phase).toBe('finding');
  });
  it('completa tres búsquedas y tres preguntas sin sumar dos veces el acierto global', () => {
    let m = createClassroomMission();
    let progress = emptyProgress();
    const send = (event: Parameters<typeof transitionMission>[1]) => {
      const change = transitionMission(m, event); m = change.state;
      progress = applyMissionProgress(progress, change);
      return change;
    };
    send({ type: 'start', targets: m.targets });
    for (const id of ['book', 'chair', 'backpack']) { send({ type: 'select', wordId: id, observed: true }); send({ type: 'next' }); }
    expect(m.phase).toBe('practice');
    expect(progress.points).toBe(30);
    expect(progress.words).toEqual({});
    send({ type: 'finish' }); expect(m.phase).toBe('practice');
    for (const [i, question] of m.questions.entries()) {
      const event = { type: 'answer' as const, questionId: question.id, wordId: question.word.id, correct: i !== 1 };
      send(event); send(event);
    }
    send({ type: 'finish' });
    expect(m.phase).toBe('complete');
    expect(m.points).toBe(50);
    expect(progress.points).toBe(50);
    expect(progress.words.chair).toEqual({ attempts: 1, correct: 0 });
    expect(progress.words.book).toEqual({ attempts: 1, correct: 1 });
    expect(progress.words.backpack).toEqual({ attempts: 1, correct: 1 });
    expect(send({ type: 'finish' }).pointDelta).toBe(0);
  });
  it('rechaza respuestas ajenas a los ejercicios de esta misión', () => {
    const m = createClassroomMission();
    const change = transitionMission(m, { type: 'answer', questionId: 'identify-phone', wordId: 'phone', correct: true });
    expect(change.state).toBe(m);
    expect(change.pointDelta).toBe(0);
  });
});
