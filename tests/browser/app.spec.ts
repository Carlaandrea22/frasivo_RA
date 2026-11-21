import { expect, test } from '@playwright/test';

test('frozen video expires old labels and reports that capture stopped', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLVideoElement.prototype, 'currentTime', { configurable: true, get: () => 0 });
    window.Worker = class {
      onmessage: ((event: { data: unknown }) => void) | null = null;
      onerror: unknown;
      stopped = false;
      postMessage(message: { type: string; frame?: ImageBitmap }) {
        message.frame?.close();
        const data = message.type === 'init' ? { type: 'ready', delegate: 'GPU' } : { type: 'results', inferenceMs: 20, detections: [{ label: 'cell phone', score: .8, box: { x: .3, y: .2, width: .2, height: .5 } }] };
        setTimeout(() => { if (!this.stopped) this.onmessage?.({ data }); }, 20);
      }
      terminate() { this.stopped = true; }
    } as unknown as typeof Worker;
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
      canvas.getContext('2d')!.fillRect(0, 0, 640, 480);
      return canvas.captureStream(5);
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Activar cámara', exact: true }).click();
  await expect(page.locator('.ar-tag')).toBeVisible();
  await expect(page.locator('.ar-tag')).toHaveCount(0, { timeout: 1500 });
  await expect(page.getByRole('alert')).toContainText('imagen de la cámara', { timeout: 7000 });
});

test('adaptive scanning removes the fixed pause and keeps only one frame in flight', async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as unknown as { frameTimes: number[]; maxPending: number; testStream: MediaStream; drawTimer: number };
    state.frameTimes = []; state.maxPending = 0;
    window.Worker = class {
      onmessage: ((event: { data: unknown }) => void) | null = null;
      onerror: unknown;
      pending = 0;
      stopped = false;
      postMessage(message: { type: string; frame?: ImageBitmap }) {
        if (message.type === 'init') { setTimeout(() => this.onmessage?.({ data: { type: 'ready', delegate: 'GPU' } }), 0); return; }
        message.frame?.close();
        state.frameTimes.push(performance.now());
        state.maxPending = Math.max(state.maxPending, ++this.pending);
        setTimeout(() => {
          this.pending--;
          if (!this.stopped) this.onmessage?.({ data: { type: 'results', detections: [], inferenceMs: 50 } });
        }, 50);
      }
      terminate() { this.stopped = true; }
    } as unknown as typeof Worker;
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
      const ctx = canvas.getContext('2d')!;
      ctx.fillRect(0, 0, 640, 480);
      state.drawTimer = window.setInterval(() => ctx.fillRect(0, 0, 640, 480), 40);
      state.testStream = canvas.captureStream(25);
      return state.testStream;
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Activar cámara', exact: true }).click();
  await page.waitForFunction(() => (window as unknown as { frameTimes: number[] }).frameTimes.length >= 6);
  const result = await page.evaluate(() => {
    const state = window as unknown as { frameTimes: number[]; maxPending: number };
    const intervals = state.frameTimes.slice(1).map((t, i) => t - state.frameTimes[i]).sort((a, b) => a - b);
    return { medianInterval: intervals[Math.floor(intervals.length / 2)], maxPending: state.maxPending };
  });
  expect(result.medianInterval).toBeLessThan(250);
  expect(result.maxPending).toBe(1);
  await page.getByRole('button', { name: 'Detener escaneo', exact: true }).click();
  expect(await page.evaluate(() => {
    const state = window as unknown as { testStream: MediaStream; drawTimer: number };
    clearInterval(state.drawTimer);
    return state.testStream.getTracks().every(t => t.readyState === 'ended');
  })).toBe(true);
});

test('shows expanded camera objects and clearly separates manual-only banknotes', async ({ page }) => {
  await page.goto('/');
  await page.locator('.supported-objects summary').click();
  await expect(page.locator('.supported-list')).toContainText('Mouse de computadora');
  await expect(page.locator('.supported-list')).toContainText('Tijeras');
  await expect(page.locator('.supported-list')).not.toContainText('Billete');
  await page.getByRole('button', { name: 'Probar sin cámara', exact: true }).click();
  await page.locator('.manual-words button').filter({ hasText: 'Banknote' }).click();
  await expect(page.locator('.word-card')).toContainText('Vocabulario manual');
  await expect(page.locator('.word-card')).toContainText('Billete');
  await page.getByRole('navigation', { name: 'Navegación principal', exact: true }).getByRole('button', { name: /^Mis palabras/ }).click();
  const banknote = page.locator('.collection-word').filter({ has: page.getByRole('heading', { name: 'Banknote', exact: true }) });
  await expect(banknote).toContainText('Solo manual');
  const mouse = page.locator('.collection-word').filter({ has: page.getByRole('heading', { name: 'Mouse', exact: true }) });
  await expect(mouse).toContainText('Con cámara');
});

test('completes all three exercise types, counts a mistake, and persists results', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Probar sin cámara', exact: true }).click();
  for (const word of ['Chair', 'Book', 'Cup']) await page.locator('.manual-words button').filter({ hasText: word }).click();
  await page.getByRole('navigation', { name: 'Navegación principal', exact: true }).getByRole('button', { name: 'Practicar', exact: true }).click();
  const map: Record<string, [string, string]> = { '🪑': ['Chair', 'Silla'], '📘': ['Book', 'Libro'], '☕': ['Cup', 'Taza'] };
  for (let i = 0; i < 9; i++) {
    const [en, es] = map[await page.locator('.exercise-object').innerText()];
    const kind = await page.locator('.practice-top').innerText();
    if (kind.includes('Completa')) {
      await page.getByLabel('Palabra en inglés').fill(i === 3 ? 'wrong' : en);
      await page.getByRole('button', { name: 'Comprobar' }).click();
    } else await page.locator('.answer-option').filter({ hasText: kind.includes('Relaciona') ? es : en }).click();
    await expect(page.locator('.feedback')).toBeVisible();
    await page.getByRole('button', { name: i === 8 ? 'Ver resumen' : 'Siguiente', exact: true }).click();
  }
  await expect(page.locator('.summary-stats')).toContainText('80');
  await expect(page.locator('.summary-stats')).toContainText('89%');
  await page.reload();
  await expect(page.locator('.points')).toHaveText('80 puntos');
});

test('denied permission explains recovery; cancellation stops a late camera stream', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('denied', 'NotAllowedError'); }; });
  await page.getByRole('button', { name: 'Activar cámara', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('permiso de cámara');
  await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
    canvas.getContext('2d')!.fillRect(0, 0, 640, 480);
    const stream = canvas.captureStream(5);
    const state = window as unknown as { lateStream: MediaStream; resolveCamera: () => void };
    state.lateStream = stream;
    navigator.mediaDevices.getUserMedia = () => new Promise<MediaStream>(resolve => { state.resolveCamera = () => resolve(stream); });
  });
  await page.getByRole('button', { name: 'Activar cámara', exact: true }).click();
  await page.getByRole('button', { name: 'Detener escaneo', exact: true }).click();
  await page.evaluate(() => (window as unknown as { resolveCamera: () => void }).resolveCamera());
  await expect.poll(() => page.evaluate(() => (window as unknown as { lateStream: MediaStream }).lateStream.getTracks().every(t => t.readyState === 'ended'))).toBe(true);
  await expect(page.getByRole('button', { name: 'Activar cámara', exact: true })).toBeVisible();
});

test('PWA reloads offline and runs the real local detector in its worker', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'El inglés está a tu alrededor.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  const result = await page.evaluate(async () => new Promise<{ type: string; message?: string; detections?: unknown[] }>((resolve, reject) => {
    const worker = new Worker('/detector.worker.js');
    const timeout = setTimeout(() => { worker.terminate(); reject(new Error('Model timed out')); }, 45000);
    worker.onerror = e => { clearTimeout(timeout); worker.terminate(); reject(new Error(e.message)); };
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
  await page.getByRole('button', { name: 'Probar sin cámara', exact: true }).click();
  await page.locator('.manual-words button').filter({ hasText: 'Book' }).click();
  await page.getByRole('navigation', { name: 'Navegación móvil', exact: true }).getByRole('button', { name: 'Practicar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What is this?' })).toBeVisible();
});
