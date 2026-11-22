import { randomBytes } from 'node:crypto';
import { preview } from 'vite';
import { generateVAPIDKeys, sendNotification } from 'web-push';
import { createPushTestApi } from './push-test-api.mjs';

const port = 4186;
const accessCode = randomBytes(8).toString('hex');
const { publicKey, privateKey } = generateVAPIDKeys();
const subject = process.env.LUMAR_PUSH_SUBJECT || 'https://localhost';
const hostname = process.env.LUMAR_PUSH_HOSTNAME || new URL(subject).hostname;
const allowedHosts = hostname && hostname !== 'localhost' ? [hostname] : [];
const notify = (subscription, payload) => sendNotification(subscription, payload, {
  vapidDetails: { subject, publicKey, privateKey },
  TTL: 120,
  urgency: 'high',
  timeout: 12_000,
});

await preview({
  mode: 'push-test',
  build: { outDir: 'dist-push-test' },
  preview: { host: '127.0.0.1', port, strictPort: true, allowedHosts },
  plugins: [{
    name: 'lumar-temporary-push-test',
    configurePreviewServer(server) {
      server.middlewares.use(createPushTestApi({ accessCode, publicKey, send: notify }));
    },
  }],
});

console.log(`Prueba Push local: http://localhost:${port}/#progreso/notificaciones`);
console.log(`Código de prueba: ${accessCode}`);
console.log('Mantén este proceso abierto hasta que llegue la notificación.');
