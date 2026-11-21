import { describe, expect, it } from 'vitest';
import { loadProfile, saveProfile, type LearnerProfile } from '../src/profile/profile';
import { careerTerms } from '../src/careers/catalog';
import { careerQuestions, emptyCareerProgress, loadCareerProgress, recordCareerAnswer, saveCareerProgress } from '../src/careers/learning';
import { createSessionRepository } from '../src/profile/sessionRepository';

const profile: LearnerProfile = { version: 1, name: 'Carla', career: 'medicine', level: 'intermediate' };
const memory = () => { const data = new Map<string, string>(); return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } }; };
describe('perfil de carrera', () => {
  it('conserva el avance en memoria entre carreras aunque no pueda persistirlo', () => {
    const storage = createSessionRepository({ getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } });
    const progress = recordCareerAnswer('medicine', emptyCareerProgress(), 'heart', true);
    expect(saveCareerProgress(storage, 'medicine', progress)).toBe(false);
    expect(loadCareerProgress(storage, 'medicine').points).toBe(10);
    expect(loadCareerProgress(storage, 'gastronomy').points).toBe(0);
  });
  it('guarda, recupera y cierra un perfil local sin borrar su progreso', () => {
    const storage = memory(); storage.setItem('unrelated-progress', 'saved');
    expect(saveProfile(storage, profile)).toBe(true); expect(loadProfile(storage)).toEqual(profile);
    saveProfile(storage, null); expect(loadProfile(storage)).toBeNull(); expect(storage.getItem('unrelated-progress')).toBe('saved');
  });
  it('rechaza carreras, niveles, nombres y estructuras inválidos y tolera almacenamiento bloqueado', () => {
    for (const value of [null, [], { ...profile, career: 'law' }, { ...profile, level: 'expert' }, { ...profile, name: ' ' }, { ...profile, name: 'x'.repeat(61) }, { ...profile, version: 7 }]) {
      expect(loadProfile({ getItem: () => JSON.stringify(value) })).toBeNull();
    }
    expect(loadProfile({ getItem: () => '{broken' })).toBeNull();
    expect(loadProfile({ getItem: () => { throw Error('blocked'); } })).toBeNull();
    expect(saveProfile({ setItem: () => { throw Error('blocked'); } }, profile)).toBe(false);
  });
});
describe('inglés por carrera y nivel', () => {
  it('cada carrera practica sus propias palabras con tres dificultades diferentes', () => {
    for (const career of ['medicine', 'gastronomy', 'systems'] as const) {
      const terms = careerTerms(career);
      expect(terms).toHaveLength(10);
      expect(new Set(terms.map(t => t.id)).size).toBe(10);
      for (const level of ['beginner', 'intermediate', 'advanced'] as const) {
        const questions = careerQuestions(career, level);
        expect(questions).toHaveLength(10);
        for (const q of questions) {
          expect(terms.some(term => term.id === q.word.id)).toBe(true);
          if (level === 'beginner') { expect(q.type).toBe('match'); expect(q.answer).toBe(q.word.es); }
          else if (level === 'intermediate') { expect(q.type).toBe('identify'); expect(q.prompt).toContain('____'); expect(q.options).toContain(q.answer); }
          else { expect(q.type).toBe('complete'); expect(q.prompt.toLowerCase()).not.toContain(q.answer.toLowerCase()); }
          if (q.type !== 'complete') expect(new Set(q.options).size).toBe(4);
        }
      }
    }
    expect(careerQuestions('medicine', 'beginner').some(q => q.word.en === 'Heart')).toBe(true);
    expect(careerQuestions('gastronomy', 'beginner').some(q => q.word.en === 'Whisk')).toBe(true);
    expect(careerQuestions('medicine', 'beginner').some(q => q.word.en === 'Array')).toBe(false);
  });
  it('conserva estadísticas por carrera y rechaza palabras ajenas o datos corruptos', () => {
    const storage = memory(); const empty = emptyCareerProgress();
    const result = recordCareerAnswer('medicine', empty, 'heart', true);
    expect(result.points).toBe(10); expect(result.words.heart).toEqual({ attempts: 1, correct: 1 });
    expect(recordCareerAnswer('medicine', result, 'array', true)).toEqual(result);
    expect(saveCareerProgress(storage, 'medicine', result)).toBe(true);
    expect(loadCareerProgress(storage, 'medicine')).toEqual(result);
    expect(loadCareerProgress(storage, 'systems')).toEqual(empty);
    expect(loadCareerProgress({ getItem: () => JSON.stringify({ ...result, words: { heart: { attempts: 0, correct: 2 } } }) }, 'medicine')).toEqual(empty);
    expect(loadCareerProgress({ getItem: () => '{broken' }, 'medicine')).toEqual(empty);
  });
});
