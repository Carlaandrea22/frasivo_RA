import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { expect, it, vi } from 'vitest';
import { createPushTestApi, isPushTestSubscription, pushTestDelay } from '../scripts/push-test-api.mjs';

const sample = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/test-fixture',
  keys: { auth: Buffer.alloc(16).toString('base64url'), p256dh: Buffer.alloc(65).toString('base64url') },
};

it('solo acepta suscripciones HTTPS de proveedores conocidos', () => {
  expect(isPushTestSubscription(sample)).toBe(true);
  expect(isPushTestSubscription({ ...sample, endpoint: 'https://web.push.apple.com/Q-demo' })).toBe(true);
  expect(isPushTestSubscription({ ...sample, endpoint: 'http://127.0.0.1:4186/api' })).toBe(false);
  expect(isPushTestSubscription({ ...sample, endpoint: 'https://fcm.googleapis.com.example.com/fcm/send/test' })).toBe(false);
  expect(isPushTestSubscription({ ...sample, endpoint: 'https://fcm.googleapis.com:8080/test' })).toBe(false);
});

it('programa un único envío de prueba en el servidor para 60 segundos y distingue aceptación de fallo', async () => {
  const timers = [];
  const send = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce({ statusCode: 410 });
  const handler = createPushTestApi({
    accessCode: 'test-code', publicKey: 'public-key', now: () => 1234, send,
    schedule: (callback, wait) => timers.push({ callback, wait }),
  });
  const server = createServer((request, response) => void handler(request, response, () => response.end()));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/push-test/`;
  const headers = { 'X-Lumar-Push-Code': 'test-code', 'Content-Type': 'application/json' };
  const schedule = () => fetch(url + 'schedule', { method: 'POST', headers, body: JSON.stringify(sample) });
  try {
    expect((await fetch(url + 'config')).status).toBe(401);
    const config = await (await fetch(url + 'config', { headers })).json();
    expect(config).toEqual({ publicKey: 'public-key' });
    const reply = await schedule();
    expect(reply.status).toBe(202);
    const job = await reply.json();
    expect(job).toMatchObject({ sendAt: 61234, status: 'scheduled' });
    expect(timers[0].wait).toBe(pushTestDelay);
    expect(send).not.toHaveBeenCalled();
    expect((await schedule()).status).toBe(409);

    // These callbacks run independently of the original HTTP request.
    await timers.shift().callback();
    expect(send).toHaveBeenCalledWith(sample, '{"type":"lumar-push-test"}');
    expect(await (await fetch(url + 'jobs/' + job.id, { headers })).json()).toMatchObject({ status: 'accepted' });

    const failed = await (await schedule()).json();
    await timers.shift().callback();
    expect(await (await fetch(url + 'jobs/' + failed.id, { headers })).json()).toMatchObject({ status: 'failed', providerStatus: 410 });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

it('el service worker muestra el aviso sin ventana y abre LumAR al tocarlo', async () => {
  const listeners = new Map();
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const openWindow = vi.fn().mockResolvedValue(undefined);
  vm.runInNewContext(readFileSync(new URL('../scripts/push-test-worker.js', import.meta.url), 'utf8'), {
    URL,
    self: {
      addEventListener: (name, handler) => listeners.set(name, handler),
      registration: { showNotification },
      clients: { matchAll: async () => [], openWindow },
      location: { origin: 'https://lumar.example' },
    },
  });
  let completed;
  const waitUntil = task => { completed = task; };
  listeners.get('push')({ data: { json: () => ({ type: 'lumar-push-test' }) }, waitUntil });
  await completed;
  expect(showNotification).toHaveBeenCalledWith('LumAR · Prueba de notificación', expect.objectContaining({ tag: 'lumar-push-test' }));
  const close = vi.fn();
  listeners.get('notificationclick')({ notification: { tag: 'lumar-push-test', close }, waitUntil });
  await completed;
  expect(close).toHaveBeenCalled();
  expect(openWindow).toHaveBeenCalledWith('https://lumar.example/#progreso/notificaciones');
});
