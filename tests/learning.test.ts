import { describe, it, expect } from 'vitest';
import { recognizedWords, createQuestions, checkAnswer, recordAnswer } from '../src/learning';
import { loadProgress, saveProgress, emptyProgress } from '../src/storage';

describe('reconocimiento honesto', () => {
  it('descarta confianza baja, clases desconocidas y duplicados', () => {
    expect(recognizedWords([{ label: 'chair', score: .92 }, { label: 'chair', score: .8 }, { label: 'book', score: .2 }, { label: 'door', score: .99 }]).map(x => x.word.id)).toEqual(['chair']);
  });
  it('mapea los nombres reales del modelo al vocabulario educativo', () => {
    expect(recognizedWords([{ label: 'dining table', score: .9 }, { label: 'cell phone', score: .8 }]).map(x => x.word.en)).toEqual(['Table', 'Phone']);
  });
  it('habilita objetos de clase y comida usando las etiquetas reales del detector', () => {
    const labels = ['mouse', 'keyboard', 'scissors', 'clock', 'remote', 'tv', 'umbrella', 'handbag', 'suitcase', 'bowl', 'spoon', 'fork', 'knife', 'banana', 'apple', 'orange', 'sandwich', 'pizza', 'toothbrush', 'potted plant'];
    expect(recognizedWords(labels.map(label => ({ label, score: .9 }))).map(r => r.word.en)).toEqual(['Mouse', 'Keyboard', 'Scissors', 'Clock', 'Remote control', 'TV', 'Umbrella', 'Handbag', 'Suitcase', 'Bowl', 'Spoon', 'Fork', 'Knife', 'Banana', 'Apple', 'Orange', 'Sandwich', 'Pizza', 'Toothbrush', 'Plant']);
  });
  it('no finge reconocimiento automático de billetes ni lapiceros', () => {
    expect(recognizedWords([{ label: 'banknote', score: .99 }, { label: 'pen', score: .99 }])).toEqual([]);
    const questions = createQuestions(['banknote', 'pen']);
    expect(questions).toHaveLength(6);
    expect(questions.find(q => q.word.id === 'banknote')?.word.es).toBe('Billete');
  });
});
describe('aprendizaje', () => {
  it('enseña el artículo y el plural correctos para los nuevos objetos', () => {
    const questions = createQuestions(['apple', 'umbrella', 'scissors', 'mouse']);
    const promptFor = (id: string) => questions.find(q => q.type === 'complete' && q.word.id === id)?.prompt;
    expect(promptFor('apple')).toBe('This is an ____.');
    expect(promptFor('umbrella')).toBe('This is an ____.');
    expect(promptFor('scissors')).toBe('These are ____.');
    expect(promptFor('mouse')).toBe('This is a ____.');
  });
  it('genera los tres tipos con respuestas y distractores únicos de la sesión', () => {
    const questions = createQuestions(['chair', 'book', 'cup']);
    expect(new Set(questions.map(q => q.type))).toEqual(new Set(['identify', 'complete', 'match']));
    expect(questions).toHaveLength(9);
    for (const q of questions) {
      expect(['chair', 'book', 'cup']).toContain(q.word.id);
      expect(q.options).toContain(q.answer);
      expect(new Set(q.options).size).toBe(q.options.length);
      expect(checkAnswer(q, q.answer.toUpperCase() + ' ')).toBe(true);
      expect(checkAnswer(q, 'wrong')).toBe(false);
    }
  });
  it('no inventa preguntas para sesiones vacías', () => expect(createQuestions([])).toEqual([]));
  it('registra fallos, aciertos y puntos sin mutar el progreso anterior', () => {
    const before = emptyProgress();
    const next = recordAnswer(recordAnswer(before, 'chair', false), 'chair', true);
    expect(next.points).toBe(10);
    expect(next.words.chair).toEqual({ attempts: 2, correct: 1 });
    expect(before.words).toEqual({});
  });
});
describe('persistencia', () => {
  it('recupera progreso válido y descarta almacenamiento corrupto', () => {
    const data = new Map<string, string>();
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } };
    const progress = recordAnswer(emptyProgress(), 'book', true);
    expect(saveProgress(storage, progress)).toBe(true);
    expect(loadProgress(storage)).toEqual(progress);
    storage.setItem('frasivo-explore:v1', '{broken');
    expect(loadProgress(storage)).toEqual(emptyProgress());
    storage.setItem('frasivo-explore:v1', JSON.stringify({ version: 1, points: -1, words: {} }));
    expect(loadProgress(storage)).toEqual(emptyProgress());
  });
  it('mantiene la app operativa cuando el navegador bloquea almacenamiento', () => {
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(loadProgress(blocked)).toEqual(emptyProgress());
    expect(saveProgress(blocked, emptyProgress())).toBe(false);
  });
});
