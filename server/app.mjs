import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import helmet from 'helmet';
import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { hashPassword, verifyPassword } from './passwords.mjs';
import { validateCredentials, validateProfile, validProgress } from './validation.mjs';
import { applyProgress } from './progress.mjs';

const userColumns = 'id, email, name, career, english_level';
const serialize = row => ({ id: row.id, email: row.email, profile: { version: 1, name: row.name, career: row.career, level: row.english_level } });
const callback = (object, method) => new Promise((resolve, reject) => object[method](error => error ? reject(error) : resolve()));
const csrfToken = () => randomBytes(32).toString('hex');
export function createApp(pool, secret, dist = resolve('dist')) {
  if (!secret || secret.length < 32) throw Error('SESSION_SECRET must have at least 32 characters');
  const app = express(); app.disable('x-powered-by'); app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: { directives: { 'script-src': ["'self'", "'wasm-unsafe-eval'"], 'worker-src': ["'self'", 'blob:'], 'img-src': ["'self'", 'data:', 'blob:'], 'media-src': ["'self'", 'blob:'], 'connect-src': ["'self'"], 'upgrade-insecure-requests': null } }, strictTransportSecurity: false }));
  app.use((_req, res, next) => { res.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()'); next(); });
  app.get('/api/health', async (_req, res) => { await pool.query('SELECT 1'); res.set('Cache-Control', 'no-store').json({ status: 'ok' }); });
  const store = new (connectPgSimple(session))({ pool, tableName: 'auth_sessions', createTableIfMissing: false, pruneSessionInterval: 900, errorLog: () => console.error('No se pudo guardar una sesión.') });
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store, private').set('Pragma', 'no-cache'); next(); }, express.json({ limit: '16kb' }), session({
    store, name: 'frasivo.sid', secret, resave: false, saveUninitialized: false,
    cookie: { httpOnly: true, secure: 'auto', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' },
  }));
  app.use('/api', (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const supplied = req.get('X-CSRF-Token'), expected = req.session?.csrf;
    let originValid = false;
    try { const origin = new URL(req.get('Origin')); originValid = origin.origin === `${req.protocol}://${req.get('host')}`; } catch {}
    if (!originValid) return res.status(403).json({ code: 'ORIGIN_INVALID', error: 'La solicitud no procede del origen de Frasivo.' });
    if (typeof supplied !== 'string' || !/^[a-f0-9]{64}$/.test(supplied) || typeof expected !== 'string' || supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return res.status(403).json({ code: 'SESSION_CHANGED', error: 'La sesión de seguridad cambió. Vuelve a iniciar sesión.' });
    next();
  });
  const getProgress = async userId => Object.fromEntries((await pool.query('SELECT scope, progress FROM user_progress WHERE user_id = $1', [userId])).rows.map(row => [row.scope, row.progress]));
  const payload = async (req, row) => ({ user: serialize(row), csrf: req.session.csrf, progress: await getProgress(row.id) });
  const authenticate = async (req, row) => { await callback(req.session, 'regenerate'); req.session.userId = row.id; req.session.csrf = csrfToken(); await callback(req.session, 'save'); };
  const requireUser = async (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Inicia sesión para continuar.' });
    const result = await pool.query(`SELECT ${userColumns} FROM users WHERE id = $1`, [req.session.userId]);
    if (!result.rowCount) return res.status(401).json({ error: 'Inicia sesión para continuar.' });
    req.account = result.rows[0]; next();
  };
  app.get('/api/session', async (req, res) => {
    req.session.csrf ??= csrfToken();
    if (!req.session.userId) return res.json({ user: null, csrf: req.session.csrf, progress: {} });
    const result = await pool.query(`SELECT ${userColumns} FROM users WHERE id = $1`, [req.session.userId]);
    res.json(result.rowCount ? await payload(req, result.rows[0]) : { user: null, csrf: req.session.csrf, progress: {} });
  });
  const attempts = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false, skipSuccessfulRequests: true, message: { error: 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.' } });
  const loginAttempts = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, skipSuccessfulRequests: true, keyGenerator: req => `${ipKeyGenerator(req.ip)}:${createHash('sha256').update(String(req.body?.email ?? '').trim().toLowerCase().slice(0, 254)).digest('hex')}`, message: { error: 'Demasiados intentos con esta cuenta. Inténtalo más tarde.' } });
  app.post('/api/register', attempts, async (req, res) => {
    const credentials = validateCredentials(req.body), profile = validateProfile(req.body?.profile);
    if (!credentials || !profile) return res.status(400).json({ error: 'Revisa el correo, la contraseña (12–128 caracteres), tu nombre, carrera y nivel.' });
    const hash = await hashPassword(credentials.password);
    try {
      const result = await pool.query(`INSERT INTO users(email, password_hash, name, career, english_level) VALUES ($1, $2, $3, $4, $5) RETURNING ${userColumns}`, [credentials.email, hash, profile.name, profile.career, profile.level]);
      await authenticate(req, result.rows[0]); res.status(201).json(await payload(req, result.rows[0]));
    } catch (error) { if (error.code === '23505') return res.status(409).json({ error: 'No se pudo crear la cuenta con ese correo. Si ya tienes una cuenta, inicia sesión.' }); throw error; }
  });
  // A dummy hash gives unknown addresses the same password-work path.
  const dummyHash = hashPassword(randomBytes(32).toString('hex'));
  app.post('/api/login', attempts, loginAttempts, async (req, res) => {
    const credentials = validateCredentials(req.body);
    if (!credentials) return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    const result = await pool.query(`SELECT ${userColumns}, password_hash FROM users WHERE email = $1`, [credentials.email]);
    const row = result.rows[0];
    const valid = await verifyPassword(credentials.password, row?.password_hash ?? await dummyHash);
    if (!row || !valid) return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    await authenticate(req, row); res.json(await payload(req, row));
  });
  app.post('/api/logout', async (req, res) => { await callback(req.session, 'destroy'); res.clearCookie('frasivo.sid', { path: '/', httpOnly: true, sameSite: 'lax', secure: req.secure }); res.status(204).end(); });
  app.get('/api/me', requireUser, (req, res) => res.json({ user: serialize(req.account) }));
  app.put('/api/me', requireUser, async (req, res) => {
    const profile = validateProfile(req.body);
    if (!profile) return res.status(400).json({ error: 'Revisa tu nombre, carrera y nivel.' });
    const result = await pool.query(`UPDATE users SET name=$1, career=$2, english_level=$3, updated_at=now() WHERE id=$4 RETURNING ${userColumns}`, [profile.name, profile.career, profile.level, req.account.id]);
    res.json({ user: serialize(result.rows[0]) });
  });
  app.get('/api/progress', requireUser, async (req, res) => res.json({ progress: await getProgress(req.account.id) }));
  app.put('/api/progress', requireUser, async (req, res) => {
    const result = await applyProgress(pool, req.account.id, req.body);
    res.status(result.status).json(result.error ? { error: result.error } : { saved: true, progress: result.progress });
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));
  app.get('/sw.js', (_req, res) => res.set('Cache-Control', 'no-cache').sendFile(resolve(dist, 'sw.js')));
  app.use(express.static(dist, { index: false, maxAge: 0 }));
  app.use((req, res) => { if (req.method === 'GET' && req.accepts('html')) return res.set('Cache-Control', 'no-cache').sendFile(resolve(dist, 'index.html')); res.status(404).end(); });
  app.use((error, _req, res, _next) => {
    const status = error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 503;
    console.error(`Error de API (${error.code ?? error.type ?? 'unavailable'}).`);
    res.status(status).set('Cache-Control', 'no-store').json({ error: status === 503 ? 'El servicio no está disponible. Inténtalo de nuevo en unos momentos.' : 'La solicitud no es válida.' });
  });
  return { app, store };
}
