const careers = new Set(['medicine', 'gastronomy', 'systems']);
const levels = new Set(['beginner', 'intermediate', 'advanced']);
const scopes = new Set(['frasivo-explore:v1', 'frasivo-explore:v1:medicine', 'frasivo-explore:v1:gastronomy', ...[...careers].map(id => `frasivo-career-progress:v1:${id}`)]);
export function validateCredentials(body) {
  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') return null;
  const email = body.email.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || body.password.length < 12 || body.password.length > 128) return null;
  return { email, password: body.password };
}
export function validateProfile(body) {
  if (!body || body.version !== 1 || typeof body.name !== 'string' || !body.name.trim() || body.name.length > 60 || !careers.has(body.career) || !levels.has(body.level)) return null;
  return { version: 1, name: body.name.trim(), career: body.career, level: body.level };
}
export function validProgress(key, value) {
  if (!scopes.has(key) || !value || value.version !== 1 || !Number.isSafeInteger(value.points) || value.points < 0 || value.points > 1e9 || !value.words || typeof value.words !== 'object' || Array.isArray(value.words)) return false;
  const entries = Object.entries(value.words);
  return entries.length <= 150 && entries.every(([id, stat]) => /^[a-z][a-z0-9-]{0,59}$/.test(id) && stat && Number.isSafeInteger(stat.attempts) && Number.isSafeInteger(stat.correct) && stat.correct >= 0 && stat.attempts >= stat.correct && stat.attempts <= 1e7);
}
