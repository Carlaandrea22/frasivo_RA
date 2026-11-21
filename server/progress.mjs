import { createHash } from 'node:crypto';
import { validProgress } from './validation.mjs';
const empty = () => ({ version: 1, points: 0, words: {} });
const sorted = progress => [progress.points, Object.entries(progress.words).sort(([a], [b]) => a.localeCompare(b)).map(([id, s]) => [id, s.attempts, s.correct])];
export async function applyProgress(pool, userId, body) {
  const { key, value, base, requestId } = body ?? {};
  if (!validProgress(key, value) || !validProgress(key, base) || typeof requestId !== 'string' || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(requestId)) return { status: 400, error: 'El progreso recibido no es válido.' };
  const points = value.points - base.points;
  if (points < 0) return { status: 400, error: 'El progreso no puede retroceder.' };
  const deltas = [];
  for (const id of new Set([...Object.keys(base.words), ...Object.keys(value.words)])) {
    const old = base.words[id] ?? { attempts: 0, correct: 0 }, next = value.words[id] ?? { attempts: 0, correct: 0 };
    const attempts = next.attempts - old.attempts, correct = next.correct - old.correct;
    if (attempts < 0 || correct < 0 || correct > attempts) return { status: 400, error: 'Las respuestas recibidas no son válidas.' };
    deltas.push([id, attempts, correct]);
  }
  const hash = createHash('sha256').update(JSON.stringify([key, sorted(base), sorted(value)])).digest('hex');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO user_progress(user_id,scope,progress) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [userId, key, empty()]);
    const row = await client.query('SELECT progress FROM user_progress WHERE user_id=$1 AND scope=$2 FOR UPDATE', [userId, key]);
    const inserted = await client.query('INSERT INTO progress_writes(user_id,request_id,scope,payload_hash) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING request_id', [userId, requestId, key, hash]);
    if (!inserted.rowCount) {
      const old = await client.query('SELECT payload_hash FROM progress_writes WHERE user_id=$1 AND request_id=$2', [userId, requestId]);
      await client.query('COMMIT');
      return old.rows[0].payload_hash === hash ? { status: 200, progress: row.rows[0].progress } : { status: 409, error: 'La solicitud repetida contiene datos distintos.' };
    }
    const current = row.rows[0].progress;
    current.points += points;
    for (const [id, attempts, correct] of deltas) {
      const old = current.words[id] ?? { attempts: 0, correct: 0 };
      current.words[id] = { attempts: old.attempts + attempts, correct: old.correct + correct };
    }
    if (!validProgress(key, current)) { await client.query('ROLLBACK'); return { status: 400, error: 'El progreso supera los límites permitidos.' }; }
    await client.query('UPDATE user_progress SET progress=$1, updated_at=now() WHERE user_id=$2 AND scope=$3', [current, userId, key]);
    await client.query('COMMIT'); return { status: 200, progress: current };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
