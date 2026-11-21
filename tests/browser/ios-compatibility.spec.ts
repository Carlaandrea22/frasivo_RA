import { expect, test } from '@playwright/test';

test.use({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1' });

test('real detector initializes and analyzes with the Chrome iPhone identification', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => new Promise<{ type: string; message?: string; detections?: unknown[] }>((resolve, reject) => {
    const worker = new Worker('/detector.worker.js');
    const timeout = setTimeout(() => { worker.terminate(); reject(new Error('Detector timeout')); }, 45000);
    worker.onerror = event => { clearTimeout(timeout); worker.terminate(); reject(new Error(event.message)); };
    worker.onmessage = async ({ data }) => {
      if (data.type === 'ready') {
        const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
        const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#eeeeee'; ctx.fillRect(0, 0, 640, 480);
        const frame = await createImageBitmap(canvas);
        worker.postMessage({ type: 'frame', frame, timestamp: performance.now() }, [frame]);
      } else if (data.type === 'results' || data.type === 'error') { clearTimeout(timeout); worker.terminate(); resolve(data); }
    };
    worker.postMessage({ type: 'init' });
  }));
  expect(result.type, result.message).toBe('results');
  expect(result.detections).toEqual([]);
});

test('model errors expose a diagnostic and release the camera', async ({ page }) => {
  await page.addInitScript(() => {
    window.Worker = class {
      onmessage: ((event: { data: unknown }) => void) | null = null;
      onerror: unknown;
      postMessage() { setTimeout(() => this.onmessage?.({ data: { type: 'error', message: 'WebGL2 context unavailable' } }), 0); }
      terminate() {}
    } as unknown as typeof Worker;
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
      canvas.getContext('2d')!.fillRect(0, 0, 640, 480);
      const stream = canvas.captureStream(5);
      (window as unknown as { diagnosticStream: MediaStream }).diagnosticStream = stream;
      return stream;
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Activar cámara', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('.camera-error summary')).toBeVisible();
  await page.locator('.camera-error summary').click();
  await expect(page.locator('.camera-error code')).toHaveText('WebGL2 context unavailable');
  expect(await page.evaluate(() => (window as unknown as { diagnosticStream: MediaStream }).diagnosticStream.getTracks().every(t => t.readyState === 'ended'))).toBe(true);
});
