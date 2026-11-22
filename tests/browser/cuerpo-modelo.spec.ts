import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('el worker en CPU calienta Full, cambia de modelo y vuelve a Lite con su motivo', async ({ page }) => {
  const source = 'data:image/jpeg;base64,' + (await readFile('tests/fixtures/pose-front.jpg')).toString('base64');
  await page.goto('/#cuerpo');
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));

  const tracked = await page.evaluate(async source => {
    const appCache = await caches.open((await caches.keys()).find(name => name.startsWith('lumar-'))!);
    const workerUrl = (await appCache.keys()).find(request => /\/pose\.worker-[^/]+\.js$/.test(request.url))?.url;
    if (!workerUrl) throw new Error('No se encontró el worker de Pose.');
    const photo = new Image();
    photo.src = source;
    await photo.decode();
    const canvas = new OffscreenCanvas(560, 1040);
    const context = canvas.getContext('2d')!;
    const scale = canvas.height/925;
    context.drawImage(photo, 140, 65, 550, 925, (canvas.width-550*scale)/2, 0, 550*scale, canvas.height);
    const worker = new Worker(workerUrl);
    const changes: string[] = [];
    worker.addEventListener('message', ({ data }) => {
      if (data.type === 'pose-engine') changes.push(data.reason);
    });

    function send(type: string, message: Record<string, unknown>, transfer: Transferable[] = []) {
      return new Promise<MessageEvent['data']>((resolve, reject) => {
        const receive = ({ data }: MessageEvent) => {
          if (data.type !== type && data.type !== 'error' && data.reason !== 'full-no-disponible') return;
          worker.removeEventListener('message', receive);
          if (data.type !== type) reject(new Error(data.message ?? data.reason));
          else resolve(data);
        };
        worker.addEventListener('message', receive);
        worker.onerror = error => reject(new Error(error.message));
        worker.postMessage(message, transfer);
      });
    }

    let timestamp = 0;
    const frame = async () => {
      const bitmap = await createImageBitmap(canvas);
      timestamp += 90;
      const result = await send('pose', { type: 'frame', timestamp, frame: bitmap }, [bitmap]);
      return { model: result.model, delegate: result.delegate, landmarks: result.points.length };
    };
    try {
      await send('ready', { type: 'init', delegate: 'CPU', diagnostics: true });
      const initial = await frame();
      await send('pose-model-prepared', { type: 'try-full' });
      let upgraded = await frame();
      for (let i = 1; i < 6 && upgraded.model !== 'full'; i++) upgraded = await frame();
      worker.postMessage({ type: 'use-lite', reason: 'full-fps-bajos' });
      return { initial, upgraded, fallback: await frame(), changes };
    } finally {
      worker.terminate();
    }
  }, source);

  expect(tracked).toEqual({
    initial: { model: 'lite', delegate: 'CPU', landmarks: 33 },
    upgraded: { model: 'full', delegate: 'CPU', landmarks: 33 },
    fallback: { model: 'lite', delegate: 'CPU', landmarks: 33 },
    changes: ['cpu-solicitada', 'full-activo', 'full-fps-bajos'],
  });
});
