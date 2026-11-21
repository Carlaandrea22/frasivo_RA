import { expect, it } from 'vitest';
import { createAccountRepository } from '../src/auth/accountRepository';

it('hidrata solo el progreso del usuario y guarda cambios en orden', async () => {
  const saved: number[] = [];
  const repository = createAccountRepository({ key: { version: 1, points: 10, words: {} } }, async (_key, value) => { saved.push(value.points); }, () => {});
  expect(JSON.parse(repository.getItem('key')!).points).toBe(10);
  expect(repository.getItem('frasivo-profile:v1')).toBeNull();
  repository.setItem('key', JSON.stringify({ version: 1, points: 20, words: {} }));
  repository.setItem('key', JSON.stringify({ version: 1, points: 30, words: {} }));
  await repository.flush(); expect(saved.at(-1)).toBe(30);
  repository.dispose();
});
it('conserva cambios para reintentar y cancela las peticiones al cerrar la cuenta', async () => {
  let blocked = true; let lastSignal: AbortSignal | undefined; const states: string[] = [];
  const repository = createAccountRepository({}, async (_key, _value, signal) => { lastSignal = signal; if (blocked) throw Error('offline'); }, state => states.push(state));
  repository.setItem('key', JSON.stringify({ version: 1, points: 10, words: {} }));
  await expect(repository.flush()).rejects.toThrow('offline'); expect(states).toContain('error');
  blocked = false; await repository.flush(); expect(states.at(-1)).toBe('saved');
  repository.dispose(); expect(lastSignal!.aborted).toBe(true);
  expect(() => repository.setItem('key', '{}')).toThrow();
});
it('reintenta la misma escritura incierta antes de enviar respuestas posteriores', async () => {
  const writes: { points: number; id: string; base: number }[] = []; let fail = true;
  const repository = createAccountRepository({}, async (_key, value, _signal, write) => { writes.push({ points: value.points, id: write.requestId, base: write.base.points }); if (fail) throw Error('connection lost after commit'); }, () => {});
  repository.setItem('key', JSON.stringify({ version: 1, points: 10, words: {} }));
  await expect(repository.flush()).rejects.toThrow();
  repository.setItem('key', JSON.stringify({ version: 1, points: 20, words: {} }));
  await expect(repository.flush()).rejects.toThrow(); fail = false;
  await repository.flush();
  expect(writes[0].id).toBe(writes[1].id); expect(writes[1].id).toBe(writes[2].id);
  expect(writes.at(-1)?.base).toBe(10); expect(writes.at(-1)?.points).toBe(20);
  expect(writes.at(-1)?.id).not.toBe(writes[0].id); repository.dispose();
});
