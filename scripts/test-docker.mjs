import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
const docker = process.platform === 'win32' ? 'docker.exe' : 'docker';
const env = { ...process.env, FRASIVO_PORT: '4181', FRASIVO_TEST_URL: 'http://127.0.0.1:4181' };
const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { env, stdio: 'inherit' });
  child.once('error', reject); child.once('exit', code => code === 0 ? resolve() : reject(Error(`La comprobación terminó con código ${code}.`)));
});
let failed = false;
try {
  await run(process.execPath, ['scripts/setup-docker.mjs']);
  await run(docker, ['compose', '-p', 'frasivo-explore-tests', 'up', '--build', '-d']);
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) { try { ready = (await fetch(`${env.FRASIVO_TEST_URL}/api/health`)).ok; } catch {} if (ready) break; await setTimeout(1000); }
  if (!ready) throw Error('El servidor de pruebas no pudo iniciarse.');
  await run(process.execPath, ['--test', 'tests/server/auth.test.mjs', 'tests/server/api.integration.mjs']);
  await run(process.execPath, ['node_modules/@playwright/test/cli.js', 'test']);
} catch (error) { failed = true; console.error(error.message); }
finally { try { await run(docker, ['compose', '-p', 'frasivo-explore-tests', 'stop']); } catch { failed = true; } }
if (failed) process.exitCode = 1;
