import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const modelPaths = ['/body-tracking/hand_landmarker.task', '/body-tracking/face_landmarker.task'];

test('los modelos de mano y cara se cargan bajo demanda y funcionan sin conexión', async ({ page, context }) => {
  const photos = await Promise.all(['region-hand-open.jpg', 'region-face-front.jpg'].map(async name =>
    `data:image/jpeg;base64,${(await readFile(`tests/fixtures/${name}`)).toString('base64')}`,
  ));
  await page.goto('/');
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));

  const cachedModels = () => page.evaluate(paths => Promise.all(paths.map(async path => Boolean(await caches.match(path)))), modelPaths);
  expect(await cachedModels()).toEqual([false, false]);

  const detectHandsAndFace = () => page.evaluate(async urls => {
    const cacheNames = await caches.keys();
    const appCache = await caches.open(cacheNames.find(name => name.startsWith('lumar-'))!);
    const workerUrl = (await appCache.keys()).find(request => /\/pose\.worker-[^/]+\.js$/.test(request.url))?.url;
    if (!workerUrl) throw new Error('No se encontró el worker en la caché de la app.');
    const worker = new Worker(workerUrl);
    function send(data: Record<string, unknown>, transfer: Transferable[] = []) {
      return new Promise<MessageEvent['data']>((resolve, reject) => {
        worker.onmessage = ({ data }) => {
          if (data.type === 'error' || data.type === 'detector-unavailable') reject(new Error(data.message));
          else resolve(data);
        };
        worker.onerror = error => reject(new Error(error.message));
        worker.postMessage(data, transfer);
      });
    }
    try {
      await send({ type: 'init', delegate: 'CPU' });
      const [handUrl, faceUrl] = urls;
      const landmarks = [];
      for (const [detector, url] of [['hand', handUrl], ['face', faceUrl]]) {
        await send({ type: 'prepare', detector });
        const frame = await createImageBitmap(await (await fetch(url)).blob());
        const result = await send({ type: 'frame', detector, frame, timestamp: performance.now() }, [frame]);
        if (detector === 'hand') {
          const hand = result.hands[0];
          landmarks.push(hand?.landmarks.length, hand?.worldLandmarks.length);
        } else {
          landmarks.push(result.face?.landmarks.length, result.face?.matrix.length);
        }
      }
      return landmarks;
    } finally {
      worker.terminate();
    }
  }, photos);

  expect(await detectHandsAndFace()).toEqual([21, 21, 478, 16]);
  await expect.poll(cachedModels).toEqual([true, true]);
  await context.setOffline(true);
  await page.reload();
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
  expect(await detectHandsAndFace()).toEqual([21, 21, 478, 16]);
});
