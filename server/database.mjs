import pg from 'pg';
export function createPool() {
  const pool = new pg.Pool({ max: 10, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000, statement_timeout: 5000 });
  pool.on('error', () => console.error('Se interrumpió una conexión con la base de datos.'));
  return pool;
}
