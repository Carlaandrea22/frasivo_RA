import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createPool } from './database.mjs';
const pool = createPool();
try {
  if (!process.env.APP_DB_PASSWORD || process.env.APP_DB_PASSWORD.length < 24) throw Error('Missing app database password');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(769231415)');
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    const role = await client.query("SELECT 1 FROM pg_roles WHERE rolname = 'frasivo_app'");
    const command = role.rowCount ? 'ALTER ROLE frasivo_app WITH LOGIN PASSWORD %L' : 'CREATE ROLE frasivo_app LOGIN PASSWORD %L';
    const quoted = await client.query('SELECT format($1, $2::text) AS statement', [command, process.env.APP_DB_PASSWORD]);
    await client.query(quoted.rows[0].statement);
    for (const name of (await readdir(new URL('./migrations/', import.meta.url))).filter(name => name.endsWith('.sql')).sort()) {
      const sql = await readFile(new URL(`./migrations/${name}`, import.meta.url), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const existing = await client.query('SELECT checksum FROM schema_migrations WHERE name = $1', [name]);
      if (existing.rowCount) { if (existing.rows[0].checksum !== checksum) throw Error('Changed migration'); continue; }
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [name, checksum]);
      console.log(`Migración aplicada: ${name}`);
    }
    await client.query('REVOKE ALL ON SCHEMA public FROM PUBLIC');
    await client.query('GRANT USAGE ON SCHEMA public TO frasivo_app');
    await client.query('GRANT SELECT, INSERT, UPDATE ON users, user_progress TO frasivo_app');
    await client.query('GRANT SELECT, INSERT ON progress_writes TO frasivo_app');
    await client.query('GRANT SELECT, INSERT, UPDATE, DELETE ON auth_sessions TO frasivo_app');
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  console.log('Base de datos preparada.');
} catch (error) { console.error(`No se pudo preparar la base de datos (${error.code ?? 'configuration'}).`); process.exitCode = 1; }
finally { await pool.end(); }
