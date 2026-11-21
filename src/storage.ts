import { wordById } from './vocabulary';
export interface Progress { version: 1; points: number; words: Record<string, { attempts: number; correct: number }> }
export interface ProgressStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export const emptyProgress = (): Progress => ({ version: 1, points: 0, words: {} });
const key = 'frasivo-explore:v1';
export function loadProgress(storage: Pick<ProgressStorage, 'getItem'>): Progress {
  try {
    const value = JSON.parse(storage.getItem(key) ?? 'null');
    if (!value || value.version !== 1 || !Number.isSafeInteger(value.points) || value.points < 0 || !value.words || typeof value.words !== 'object' || Array.isArray(value.words)) return emptyProgress();
    for (const [id, stat] of Object.entries(value.words)) {
      const s = stat as { attempts: number; correct: number } | null;
      if (!wordById(id) || !s || !Number.isSafeInteger(s.attempts) || !Number.isSafeInteger(s.correct) || s.correct < 0 || s.attempts < s.correct) return emptyProgress();
    }
    return value;
  } catch { return emptyProgress(); }
}
export function saveProgress(storage: Pick<ProgressStorage, 'setItem'>, progress: Progress): boolean {
  try { storage.setItem(key, JSON.stringify(progress)); return true; } catch { return false; }
}
// Adapter boundary: replace this repository with Frasivo's storage when integrated.
export const browserStorage: ProgressStorage = {
  getItem: k => window.localStorage.getItem(k),
  setItem: (k, v) => window.localStorage.setItem(k, v),
};
