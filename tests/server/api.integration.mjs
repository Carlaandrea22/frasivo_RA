import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.FRASIVO_TEST_URL ?? 'http://127.0.0.1:4181';
class Browser {
  cookie = ''; csrf = '';
  async request(path, method = 'GET', data, options = {}) {
    const response = await fetch(`${base}/api${path}`, { method, headers: { Cookie: this.cookie, ...(method === 'GET' ? {} : { Origin: base, 'Content-Type': 'application/json', 'X-CSRF-Token': this.csrf }), ...options.headers }, body: data === undefined ? undefined : JSON.stringify(data) });
    for (const cookie of response.headers.getSetCookie()) if (cookie.startsWith('frasivo.sid=')) this.cookie = cookie.split(';')[0];
    const body = response.status === 204 ? null : await response.json();
    if (body?.csrf) this.csrf = body.csrf;
    return { status: response.status, body, headers: response.headers };
  }
  init() { return this.request('/session'); }
}
const account = () => ({ email: `test-${randomUUID()}@example.test`, password: `Frasivo test ${randomUUID()}`, profile: { version: 1, name: 'Prueba de integración', career: 'medicine', level: 'beginner' } });
test('no local profile, forged cookie, invalid credentials or CSRF can authenticate', async () => {
  const browser = new Browser();
  assert.equal((await browser.init()).body.user, null);
  assert.equal((await browser.request('/me')).status, 401);
  const data = account();
  assert.equal((await browser.request('/register', 'POST', data, { headers: { 'X-CSRF-Token': '' } })).status, 403);
  assert.equal((await browser.request('/register', 'POST', data, { headers: { Origin: 'https://another.example' } })).status, 403);
  assert.equal((await browser.request('/register', 'POST', data, { headers: { 'X-CSRF-Token': 'é'.repeat(64) } })).status, 403);
  assert.equal((await browser.request('/register', 'POST', { ...data, password: 'short' })).status, 400);
  assert.equal((await browser.request('/register', 'POST', { ...data, profile: { ...data.profile, career: 'law' } })).status, 400);
  browser.cookie = 'frasivo.sid=s%3Afake.signature';
  assert.equal((await browser.init()).body.user, null);
});
test('real accounts persist profile and progress, isolate users and invalidate logout sessions', async () => {
  const a = new Browser(), b = new Browser(); await a.init(); await b.init();
  const data = account(); const oldCookie = a.cookie;
  const registration = await a.request('/register', 'POST', { ...data, email: ` ${data.email.toUpperCase()} ` });
  assert.equal(registration.status, 201); assert.equal(registration.body.user.email, data.email);
  assert.equal(registration.body.user.password_hash, undefined); assert.notEqual(a.cookie, oldCookie);
  const cookie = registration.headers.get('set-cookie'); assert.match(cookie, /HttpOnly/i); assert.match(cookie, /SameSite=Lax/i);
  assert.match(registration.headers.get('cache-control'), /no-store/);
  assert.equal((await b.request('/register', 'POST', data)).status, 409);
  const dataB = { ...account(), profile: { ...data.profile, career: 'systems' } };
  assert.equal((await b.request('/register', 'POST', dataB)).status, 201);
  const progress = { version: 1, points: 30, words: { heart: { attempts: 3, correct: 3 } } };
  assert.equal((await a.request('/progress', 'PUT', { key: 'frasivo-career-progress:v1:medicine', value: progress, base: { version: 1, points: 0, words: {} }, requestId: randomUUID(), userId: registration.body.user.id })).status, 200);
  assert.equal((await b.request('/progress')).body.progress['frasivo-career-progress:v1:medicine'], undefined);
  assert.equal((await a.request('/me', 'PUT', { ...data.profile, name: 'Perfil actualizado', level: 'advanced', id: dataB.id })).status, 200);
  assert.equal((await b.request('/me')).body.user.profile.career, 'systems');
  const oldSession = a.cookie;
  assert.equal((await a.request('/logout', 'POST', {})).status, 204);
  assert.equal((await a.request('/me')).status, 401);
  const replay = new Browser(); replay.cookie = oldSession; assert.equal((await replay.init()).body.user, null);
  await a.init();
  assert.equal((await a.request('/login', 'POST', { email: data.email, password: 'a wrong password 123' })).status, 401);
  const login = await a.request('/login', 'POST', data);
  assert.equal(login.status, 200); assert.equal(login.body.user.profile.level, 'advanced');
  assert.equal(login.body.user.profile.name, 'Perfil actualizado');
  assert.deepEqual(login.body.progress['frasivo-career-progress:v1:medicine'], progress);
  assert.notEqual(a.cookie, oldSession);
  await mkdir('.superpowers', { recursive: true });
  await writeFile('.superpowers/auth-persistence.json', JSON.stringify({ ...data, cookie: a.cookie, csrf: a.csrf }));
});
test('login limits repeated failed attempts', async () => {
  const browser = new Browser(); await browser.init(); const data = account(); let status;
  for (let i = 0; i < 12; i++) { status = (await browser.request('/login', 'POST', data)).status; if (status === 429) break; }
  assert.equal(status, 429);
});
test('concurrent devices merge independent answers and retries do not duplicate points', async () => {
  const a = new Browser(), b = new Browser(); await a.init(); await b.init(); const data = account();
  await a.request('/register', 'POST', data); await b.request('/login', 'POST', data);
  const empty = { version: 1, points: 0, words: {} }, key = 'frasivo-career-progress:v1:medicine';
  const first = { key, base: empty, requestId: randomUUID(), value: { version: 1, points: 10, words: { heart: { attempts: 1, correct: 1 } } } };
  const second = { key, base: empty, requestId: randomUUID(), value: { version: 1, points: 10, words: { brain: { attempts: 1, correct: 1 } } } };
  await Promise.all([a.request('/progress', 'PUT', first), b.request('/progress', 'PUT', second)]);
  const stored = (await a.request('/progress')).body.progress[key];
  assert.equal(stored.points, 20); assert.equal(stored.words.heart.correct, 1); assert.equal(stored.words.brain.correct, 1);
  await b.request('/progress', 'PUT', second);
  assert.equal((await a.request('/progress')).body.progress[key].points, 20);
});
