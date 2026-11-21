import { createPool } from './database.mjs';
import { createApp } from './app.mjs';
const pool = createPool();
try {
  await pool.query('SELECT 1');
  const { app, store } = createApp(pool, process.env.SESSION_SECRET);
  const server = app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0', () => console.log(`Frasivo listo en el puerto ${process.env.PORT ?? 3000}.`));
  const stop = () => { server.close(async () => { store.close(); await pool.end(); process.exit(0); }); setTimeout(() => process.exit(1), 15000).unref(); };
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
} catch (error) { console.error(`No se pudo iniciar Frasivo (${error.code ?? 'configuration'}).`); await pool.end(); process.exitCode = 1; }
