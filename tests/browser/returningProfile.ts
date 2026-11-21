import { test as base, type Page } from '@playwright/test';
import type { LearnerProfile } from '../../src/profile/profile';
export { expect, type Page } from '@playwright/test';
export async function mockAccounts(page: Page, initial: LearnerProfile | null) {
  type User = { id: string; email: string; profile: LearnerProfile; password: string };
  const accounts = new Map<string, User>(), progress = new Map<string, Record<string, unknown>>();
  let user: User | null = initial ? { id: 'returning-user', email: 'carla@example.test', profile: initial, password: 'Frasivo test password 2026' } : null;
  if (user) accounts.set(user.email, user);
  const publicUser = () => user ? { id: user.id, email: user.email, profile: user.profile } : null;
  const snapshot = () => ({ user: publicUser(), csrf: 'a'.repeat(64), progress: user ? progress.get(user.id) ?? {} : {} });
  await page.route('**/api/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname, method = request.method();
    const data = method === 'GET' ? undefined : request.postDataJSON();
    let status = 200, body: unknown;
    if (path === '/api/session') body = snapshot();
    else if (path === '/api/register') {
      if (accounts.has(data.email)) { status = 409; body = { error: 'La cuenta ya existe.' }; }
      else { user = { id: `user-${accounts.size}`, ...data }; accounts.set(user!.email, user!); body = snapshot(); status = 201; }
    } else if (path === '/api/login') {
      const found = accounts.get(data.email);
      if (found && found.password === data.password) { user = found; body = snapshot(); } else { status = 401; body = { error: 'Correo o contraseña incorrectos.' }; }
    } else if (path === '/api/logout') { user = null; status = 204; }
    else if (!user) { status = 401; body = { error: 'Inicia sesión.' }; }
    else if (path === '/api/me') { if (method === 'PUT') user.profile = data; body = { user: publicUser() }; }
    else if (path === '/api/progress') {
      if (method === 'PUT') { const values = progress.get(user.id) ?? {}; values[data.key] = data.value; progress.set(user.id, values); body = { saved: true }; }
      else body = { progress: progress.get(user.id) ?? {} };
    } else { status = 404; body = { error: 'Not found' }; }
    await route.fulfill({ status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, ...(status === 204 ? {} : { body: JSON.stringify(body) }) });
  });
}
// UI regression suites mock the API boundary. auth-real.spec.ts uses PostgreSQL.
export const test = base.extend<{ accountMock: void }>({ accountMock: [async ({ page }, use) => { await mockAccounts(page, { version: 1, name: 'Carla', career: 'systems', level: 'beginner' }); await use(); }, { auto: true }] });
export const guestTest = base.extend<{ accountMock: void }>({ accountMock: [async ({ page }, use) => { await mockAccounts(page, null); await use(); }, { auto: true }] });
