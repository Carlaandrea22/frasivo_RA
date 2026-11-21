import { describe, expect, it } from 'vitest';
import {
  getProgress,
  legacyProgressKey,
  progressStorageKey,
  queryProgress,
  recordConsultation,
  recordDemonstration,
  recordPractice,
  type ProgressStorage,
} from '../src/shared/progreso';

class LocalStorage implements ProgressStorage {
  private items = new Map<string, string>();

  get length() { return this.items.size; }
  key(index: number) { return [...this.items.keys()][index] ?? null; }
  getItem(key: string) { return this.items.get(key) ?? null; }
  setItem(key: string, value: string) { this.items.set(key, value); }
}

const target = { areaId: 'anatomy', groupId: 'cardiovascular', itemId: 'heart' };
const practiceTarget = { ...target, activityId: 'technical-english' };

describe('progreso local', () => {
  it('conserva los totales migrados sin atribuirles nuevas evidencias', () => {
    const storage = new LocalStorage();
    const original = '{"version":1,"points":40,"words":{"chair":{"attempts":5,"correct":2},"bottle":{"attempts":2,"correct":2}}}';
    storage.setItem(legacyProgressKey, original);

    const snapshot = getProgress(storage);
    expect(snapshot).toEqual({
      version: 1,
      legacy: { points: 40, words: { chair: { attempts: 5, correct: 2 }, bottle: { attempts: 2, correct: 2 } } },
      events: [],
    });
    expect(storage.getItem(legacyProgressKey)).toBe(original);
    expect(storage.getItem(progressStorageKey)).toContain('"version":1');

    storage.setItem(legacyProgressKey, '{"version":1,"points":0,"words":{}}');
    expect(getProgress(storage)).toBe(snapshot);
    expect(queryProgress({ kind: 'demonstration' }, storage)).toEqual([]);
  });

  it('registra los contadores y distingue las ideas del alumno de las sugerencias', () => {
    const storage = new LocalStorage();
    const reasoning = {
      original: {
        summary: 'Resumen inicial',
        hypothesisId: 'option-a',
        evidence: 'Un dato relevante',
        missingInformation: 'Un dato que falta',
      },
      suggestions: ['Explica qué dato respalda la hipótesis.'],
      revised: {
        summary: 'Resumen revisado',
        hypothesisId: 'option-a',
        evidence: 'Explico el dato relevante.',
        missingInformation: 'Especifico el dato que falta.',
      },
    };
    const consultation = recordConsultation(target, storage);
    const context = { kind: 'caso', questionIds: ['initial', 'detail', 'follow-up'], hypothesisId: 'option-a' } as const;
    const practice = recordPractice({ ...practiceTarget, correct: 2, errors: 1, hints: 1, reasoning, context }, storage);
    recordConsultation({ ...target, areaId: 'chemistry' }, storage);

    expect(queryProgress({ ...target, kind: 'consultation' }, storage)).toEqual([consultation]);
    expect(queryProgress({ ...practiceTarget, kind: 'practice' }, storage)).toEqual([{
      ...practiceTarget,
      kind: 'practice',
      id: practice.id,
      timestamp: expect.any(String),
      correct: 2,
      errors: 1,
      hints: 1,
      reasoning,
      context,
    }]);
    expect(new Date(practice.timestamp).toISOString()).toBe(practice.timestamp);

    const reloaded = new LocalStorage();
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index)!;
      reloaded.setItem(key, storage.getItem(key)!);
    }
    expect(getProgress(reloaded)).toEqual(getProgress(storage));
  });

  it('asocia el desempeño a la misma práctica y lo registra una sola vez', () => {
    const storage = new LocalStorage();
    const practice = recordPractice({ ...practiceTarget, correct: 1, errors: 0, hints: 0 }, storage);
    expect(recordDemonstration({ ...practiceTarget, itemId: 'aorta', practiceEventId: practice.id }, storage)).toBeNull();
    expect(recordDemonstration({ ...practiceTarget, practiceEventId: 'missing' }, storage)).toBeNull();

    const input = { ...practiceTarget, practiceEventId: practice.id };
    const demonstration = recordDemonstration(input, storage);
    expect(demonstration).toMatchObject({ ...input, kind: 'demonstration' });
    expect(recordDemonstration(input, storage)).toEqual(demonstration);
    expect(queryProgress({ kind: 'demonstration' }, storage)).toEqual([demonstration]);
  });

  it('conserva el progreso durante la sesión si falla el almacenamiento', () => {
    const storage = new LocalStorage();
    storage.setItem = () => { throw new Error('Almacenamiento bloqueado'); };
    const before = getProgress(storage);
    const consultation = recordConsultation(target, storage);

    expect(before.events).toEqual([]);
    expect(getProgress(storage).events).toEqual([consultation]);
    expect(getProgress(storage)).toBe(getProgress(storage));
  });

  it('omite las entradas dañadas mientras conserva los demás registros', () => {
    const storage = new LocalStorage();
    const consultation = recordConsultation(target, storage);
    const practice = recordPractice({
      ...practiceTarget,
      correct: 1,
      errors: 0,
      hints: 0,
      context: { kind: 'reto', mode: 'entrenamiento' },
    }, storage);

    const practiceKey = `${progressStorageKey}:event:${practice.id}`;
    const damaged = JSON.stringify({ ...practice, context: { kind: 'reto', mode: 'invalid' } });
    storage.setItem(practiceKey, damaged);
    storage.setItem(`${progressStorageKey}:event:invalid`, '{');

    expect(getProgress(storage).events).toEqual([consultation]);
    expect(storage.getItem(practiceKey)).toBe(damaged);
  });

  it('conserva datos de otras versiones', () => {
    const storage = new LocalStorage();
    const newer = '{"version":2,"data":["conservar"]}';
    storage.setItem(progressStorageKey, newer);
    storage.setItem(legacyProgressKey, '{"version":1,"points":10,"words":{"chair":{"attempts":1,"correct":2}}}');
    storage.setItem(`${progressStorageKey}:event:damaged`, '{');

    const consultation = recordConsultation(target, storage);
    expect(getProgress(storage)).toEqual({ version: 1, events: [consultation], legacy: null });
    expect(storage.getItem(progressStorageKey)).toBe(newer);
    expect(storage.length).toBe(3);
  });
});
