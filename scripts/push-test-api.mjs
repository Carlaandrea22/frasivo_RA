import { randomUUID, timingSafeEqual } from 'node:crypto';

export const pushTestDelay = 60_000;
const route = '/api/push-test/';
const payload = JSON.stringify({ type: 'lumar-push-test' });
const providers = new Set(['fcm.googleapis.com', 'updates.push.services.mozilla.com']);

function isKey(value, size) {
  if (typeof value !== 'string' || !/^[\w-]+$/.test(value)) return false;
  return Buffer.from(value, 'base64url').length === size;
}

export function isPushTestSubscription(value) {
  if (typeof value?.endpoint !== 'string' || value.endpoint.length > 2200) return false;
  if (!isKey(value.keys?.auth, 16) || !isKey(value.keys?.p256dh, 65)) return false;
  try {
    const url = new URL(value.endpoint);
    const knownProvider = providers.has(url.hostname) || url.hostname.endsWith('.push.apple.com');
    return knownProvider && url.protocol === 'https:' && !url.port && !url.username && !url.password && !url.hash && url.pathname.length > 1;
  } catch {
    return false;
  }
}

async function readJson(request) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    length += chunk.length;
    if (length > 4096) {
      request.resume();
      throw new Error('La solicitud excede el tamaño permitido.');
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function createPushTestApi({ accessCode, publicKey, send, now = Date.now, schedule = setTimeout }) {
  const code = Buffer.from(accessCode);
  const jobs = new Map();
  const pending = new Set();

  return async (request, response, next) => {
    const path = request.url?.split('?')[0] ?? '';
    if (!path.startsWith(route)) return next();

    const reply = (status, json) => {
      response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(json));
    };

    const provided = request.headers['x-lumar-push-code'];
    const key = typeof provided === 'string' ? Buffer.from(provided) : Buffer.alloc(0);
    if (key.length !== code.length || !timingSafeEqual(key, code)) {
      return reply(401, { error: 'El código de esta prueba es incorrecto.' });
    }
    if (request.method === 'GET' && path === route + 'config') {
      return reply(200, { publicKey });
    }
    if (request.method === 'GET' && path.startsWith(route + 'jobs/')) {
      const job = jobs.get(path.slice((route + 'jobs/').length));
      return job ? reply(200, job) : reply(404, { error: 'El envío ya no está en este servidor.' });
    }
    if (request.method !== 'POST' || path !== route + 'schedule') return reply(404, { error: 'Ruta desconocida.' });
    if (!request.headers['content-type']?.startsWith('application/json')) {
      return reply(415, { error: 'Se necesita una suscripción en formato JSON.' });
    }

    let subscription;
    try {
      subscription = await readJson(request);
    } catch {
      return reply(400, { error: 'No se pudo leer la suscripción.' });
    }
    if (!isPushTestSubscription(subscription)) return reply(400, { error: 'La suscripción no pertenece a un proveedor compatible.' });
    if (pending.has(subscription.endpoint)) return reply(409, { error: 'Este dispositivo ya tiene un aviso pendiente.' });
    if (pending.size >= 4 || jobs.size >= 12) return reply(429, { error: 'Esta ejecución alcanzó su límite de pruebas.' });

    const job = { id: randomUUID(), sendAt: now() + pushTestDelay, status: 'scheduled' };
    jobs.set(job.id, job);
    pending.add(subscription.endpoint);
    schedule(async () => {
      try {
        await send(subscription, payload);
        job.status = 'accepted';
      } catch (error) {
        job.status = 'failed';
        if (Number.isInteger(error?.statusCode)) job.providerStatus = error.statusCode;
      } finally {
        pending.delete(subscription.endpoint);
      }
    }, pushTestDelay);
    return reply(202, job);
  };
}
