import { vocabulary, wordById, type Word } from './vocabulary';
import type { Progress } from './storage';
export interface RawRecognition { label: string; score: number; box?: { x: number; y: number; width: number; height: number } }
export interface Recognition extends RawRecognition { word: Word }
export function recognizedWords(results: RawRecognition[]): Recognition[] {
  const seen = new Set<string>();
  return [...results].sort((a, b) => b.score - a.score).flatMap(r => {
    const word = vocabulary.find(w => w.label === r.label);
    if (!word || !Number.isFinite(r.score) || r.score < .65 || r.score > 1 || seen.has(word.id)) return [];
    seen.add(word.id);
    return [{ ...r, word }];
  });
}
export interface Question { id: string; type: 'identify' | 'complete' | 'match'; word: Word; prompt: string; answer: string; options: string[] }
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function createQuestions(ids: string[]): Question[] {
  const words = [...new Set(ids)].map(wordById).filter((w): w is Word => !!w);
  return (['identify', 'complete', 'match'] as const).flatMap(type => shuffle(words).map(word => {
    const field = type === 'match' ? 'es' : 'en';
    const pool = [...words.filter(w => w.id !== word.id), ...vocabulary.filter(w => !words.includes(w))];
    const others = pool.slice(0, type === 'match' ? 3 : 2).map(w => w[field]);
    const prompt = type === 'identify' ? 'What is this?' : type === 'complete' ? word.completion ?? 'This is a ____.' : `${word.en} significa…`;
    return { id: `${type}-${word.id}`, type, word, prompt, answer: word[field], options: shuffle([word[field], ...others]) };
  }));
}
export const checkAnswer = (q: Question, answer: string) => answer.trim().toLocaleLowerCase('en') === q.answer.toLocaleLowerCase('en');
export function recordAnswer(progress: Progress, id: string, correct: boolean): Progress {
  if (!wordById(id)) return progress;
  const previous = progress.words[id] ?? { attempts: 0, correct: 0 };
  return { ...progress, points: progress.points + (correct ? 10 : 0), words: { ...progress.words, [id]: { attempts: previous.attempts + 1, correct: previous.correct + (correct ? 1 : 0) } } };
}
