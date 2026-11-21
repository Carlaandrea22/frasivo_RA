import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../../server/passwords.mjs';
import { validateCredentials, validateProfile, validProgress } from '../../server/validation.mjs';

test('password hashes use independent salts and reject wrong passwords or corrupt hashes', async () => {
  const password = 'Frasivo test password 2026';
  const first = await hashPassword(password), second = await hashPassword(password);
  assert.notEqual(first, second); assert.ok(!first.includes(password));
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword(password + 'x', first), false);
  assert.equal(await verifyPassword(password, 'broken'), false);
});
test('server validates email, password and the exact three careers and levels', () => {
  assert.deepEqual(validateCredentials({ email: '  Carla@Example.test ', password: 'a long password 123' }), { email: 'carla@example.test', password: 'a long password 123' });
  for (const body of [{ email: 'invalid', password: 'a long password 123' }, { email: 'x@example.test', password: 'short' }, { email: 'x@example.test', password: 'a'.repeat(129) }]) assert.equal(validateCredentials(body), null);
  assert.equal(validateProfile({ version: 1, name: 'Carla', career: 'law', level: 'beginner' }), null);
  assert.equal(validateProfile({ version: 1, name: 'Carla', career: 'medicine', level: 'expert' }), null);
  assert.deepEqual(validateProfile({ version: 1, name: ' Carla ', career: 'medicine', level: 'beginner' }), { version: 1, name: 'Carla', career: 'medicine', level: 'beginner' });
});
test('progress rejects invalid scopes, impossible statistics and unbounded input', () => {
  const progress = { version: 1, points: 10, words: { heart: { attempts: 1, correct: 1 } } };
  assert.equal(validProgress('frasivo-career-progress:v1:medicine', progress), true);
  assert.equal(validProgress('another-user', progress), false);
  assert.equal(validProgress('frasivo-explore:v1', { ...progress, points: -1 }), false);
  assert.equal(validProgress('frasivo-explore:v1', { ...progress, words: { heart: { attempts: 0, correct: 2 } } }), false);
});
