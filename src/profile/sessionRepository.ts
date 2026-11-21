import type { ProgressStorage } from '../storage';

// Preserve this browser session even when durable storage is unavailable.
// Writes still throw so callers can honestly report that reload loses changes.
export function createSessionRepository(durable: ProgressStorage): ProgressStorage {
  const cache = new Map<string, string>();
  return {
    getItem: key => cache.has(key) ? cache.get(key)! : durable.getItem(key),
    setItem: (key, value) => { cache.set(key, value); durable.setItem(key, value); },
  };
}
