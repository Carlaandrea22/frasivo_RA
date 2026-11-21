import type { Question } from '../learning';
import type { Progress, ProgressStorage } from '../storage';
import type { CareerId, EnglishLevel } from '../profile/profile';
import { careerTerms } from './catalog';

export const emptyCareerProgress = (): Progress => ({ version: 1, points: 0, words: {} });
const key = (career: CareerId) => `frasivo-career-progress:v1:${career}`;
export function careerQuestions(career: CareerId, level: EnglishLevel, ids?: string[]): Question[] {
  const terms = careerTerms(career);
  return terms.filter(term => !ids || ids.includes(term.id)).map((term, index) => {
    const type = level === 'beginner' ? 'match' : level === 'intermediate' ? 'identify' : 'complete';
    const answer = level === 'beginner' ? term.es : term.en;
    const others = [...terms.slice(index + 1), ...terms.slice(0, index)].slice(0, 3);
    const options = type === 'complete' ? [] : [answer, ...others.map(item => level === 'beginner' ? item.es : item.en)];
    // Rotate choices without changing the pedagogical order of the vocabulary.
    if (options.length) options.push(...options.splice(0, index % options.length));
    const position = term.example.toLowerCase().indexOf(term.en.toLowerCase());
    const sentence = term.example.slice(0, position) + '____' + term.example.slice(position + term.en.length);
    const prompt = level === 'beginner' ? `${term.en} significa…` : level === 'intermediate'
      ? sentence
      : `Which term fits this definition? ${term.definition}`;
    return { id: `${career}-${level}-${term.id}`, type, word: { ...term, completion: prompt }, prompt, answer, options };
  });
}
export function recordCareerAnswer(career: CareerId, progress: Progress, id: string, correct: boolean): Progress {
  if (!careerTerms(career).some(term => term.id === id)) return progress;
  const old = progress.words[id] ?? { attempts: 0, correct: 0 };
  return { ...progress, points: progress.points + (correct ? 10 : 0), words: { ...progress.words, [id]: { attempts: old.attempts + 1, correct: old.correct + Number(correct) } } };
}
export function loadCareerProgress(storage: Pick<ProgressStorage, 'getItem'>, career: CareerId): Progress {
  try {
    const p = JSON.parse(storage.getItem(key(career)) ?? 'null') as Progress;
    if (!p || p.version !== 1 || !Number.isSafeInteger(p.points) || p.points < 0 || !p.words || typeof p.words !== 'object' || Array.isArray(p.words)) return emptyCareerProgress();
    const valid = new Set(careerTerms(career).map(term => term.id));
    for (const [id, stat] of Object.entries(p.words)) if (!valid.has(id) || !stat || !Number.isSafeInteger(stat.attempts) || !Number.isSafeInteger(stat.correct) || stat.correct < 0 || stat.attempts < stat.correct) return emptyCareerProgress();
    return p;
  } catch { return emptyCareerProgress(); }
}
export function saveCareerProgress(storage: Pick<ProgressStorage, 'setItem'>, career: CareerId, progress: Progress): boolean {
  try { storage.setItem(key(career), JSON.stringify(progress)); return true; } catch { return false; }
}
