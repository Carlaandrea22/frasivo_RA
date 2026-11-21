import type { Progress, ProgressStorage } from '../storage';
export type SyncState = 'saved' | 'saving' | 'error';
export interface AccountRepository extends ProgressStorage { flush(): Promise<void>; dispose(): void }
export function createAccountRepository(initial: Record<string, Progress>, save: (key: string, value: Progress, signal: AbortSignal, write: { base: Progress; requestId: string }) => Promise<void>, notify: (state: SyncState, error?: unknown) => void): AccountRepository {
  const cache = new Map(Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]));
  const bases = new Map(cache);
  const pending = new Map<string, string>(), controller = new AbortController();
  let running: Promise<void> | null = null, disposed = false;
  let inFlight: { key: string; value: string; base: Progress; requestId: string } | null = null;
  const flush = (): Promise<void> => {
    if (disposed) return Promise.reject(Error('Cuenta cerrada.'));
    if (running) return running;
    if (!pending.size) return Promise.resolve();
    notify('saving');
    running = (async () => {
      while (pending.size && !disposed) {
        if (!inFlight) {
          const [key, value] = pending.entries().next().value!;
          inFlight = { key, value, base: JSON.parse(bases.get(key) ?? '{"version":1,"points":0,"words":{}}'), requestId: crypto.randomUUID() };
        }
        const { key, value, base, requestId } = inFlight;
        await save(key, JSON.parse(value), controller.signal, { base, requestId });
        if (disposed) return;
        bases.set(key, value); inFlight = null;
        if (pending.get(key) === value) pending.delete(key);
      }
      if (!disposed) notify('saved');
    })().catch(error => { if (!disposed) notify('error', error); throw error; }).finally(() => { running = null; });
    return running;
  };
  return {
    getItem: key => disposed ? null : cache.get(key) ?? null,
    setItem: (key, value) => {
      if (disposed) throw Error('Cuenta cerrada.');
      if (cache.get(key) === value) return;
      cache.set(key, value); pending.set(key, value); void flush().catch(() => {});
    }, flush,
    dispose: () => { disposed = true; controller.abort(); pending.clear(); cache.clear(); bases.clear(); inFlight = null; },
  };
}
