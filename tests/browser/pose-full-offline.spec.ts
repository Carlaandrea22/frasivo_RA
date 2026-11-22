import { activateBodyCamera } from './body-camera';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const fullModel = '/body-tracking/pose_landmarker_full.task';

test('Fijar descarga Pose Full del mismo origen y lo reutiliza sin conexión', async ({ page, context, request }) => {
  const model = await request.head(fullModel);
  expect(model.ok()).toBe(true);
  expect(Number(model.headers()['content-length'])).toBeGreaterThan(8_000_000);

  await page.setViewportSize({ width: 375, height: 812 });
  const fixture = `data:image/jpeg;base64,${(await readFile('tests/fixtures/pose-front.jpg')).toString('base64')}`;
  await page.addInitScript(url => {
    const fullWorkers = new WeakSet<Worker>();
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (this: Worker, message, ...options: unknown[]) {
      if (message.type === 'init' && message.model === 'full') fullWorkers.add(this);
      const send = () => Reflect.apply(post, this, [message, ...options]);
      if (message.type === 'frame' && fullWorkers.has(this)) setTimeout(send, 550);
      else send();
    };
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: async () => {
        const photo = new Image();
        photo.src = url;
        await photo.decode();
        const canvas = document.createElement('canvas');
        canvas.width = 560;
        canvas.height = 1040;
        const ctx = canvas.getContext('2d')!;
        const scale = 1040 / 925;
        const draw = () => ctx.drawImage(photo, 140, 65, 550, 925, (560 - 550*scale)/2, 0, 550*scale, 1040);
        draw();
        const timer = setInterval(draw, 55);
        const stream = canvas.captureStream(18);
        const track = stream.getVideoTracks()[0];
        const stop = track.stop.bind(track);
        track.stop = () => { clearInterval(timer); stop(); };
        return stream;
      },
    });
  }, fixture);

  const cached = () => page.evaluate(async path => Boolean(await caches.match(path)), fullModel);
  const modelRequests: string[] = [];
  context.on('request', event => {
    if (event.url().includes('pose_landmarker_full.task')) modelRequests.push(event.url());
  });

  await page.goto('/');
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  expect(await cached()).toBe(false);
  expect(modelRequests).toEqual([]);

  const takePose = async () => {
    await activateBodyCamera(page);
    await page.getByRole('button', { name: 'Fijar esqueleto' }).click();
    await expect(page.getByRole('button', { name: 'Ver en 3D' })).toBeEnabled({ timeout: 15_000 });
    await expect(page.getByText('Esqueleto fijado', { exact: true })).toBeVisible();
  };

  await takePose();
  expect(await cached()).toBe(true);
  expect(modelRequests.length).toBeGreaterThan(0);
  expect(modelRequests.every(url => url === new URL(fullModel, page.url()).href)).toBe(true);
  const onlineRequests = modelRequests.length;

  await context.setOffline(true);
  await page.reload();
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
  await takePose();
  expect(modelRequests).toHaveLength(onlineRequests);
});
