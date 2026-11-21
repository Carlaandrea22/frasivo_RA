import { readFile } from 'node:fs/promises';
import { expect, test, mockAccounts } from './returningProfile';

test.beforeEach(async ({ page }) => {
  await mockAccounts(page, { version: 1, name: 'Carla', career: 'medicine', level: 'beginner' });
});
test('medicine provides three illustrated layers, selectable bilingual parts and mobile controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Explorar anatomía', exact: true }).click();
  const module = page.getByRole('region', { name: 'Anatomía sobre cámara' });
  await expect(module).toBeVisible();
  await expect(module.getByText('Demostración sin cámara', { exact: true })).toBeVisible();
  for (const layer of ['Músculos', 'Huesos', 'Órganos']) {
    await module.getByRole('button', { name: layer, exact: true }).click();
    await expect(module.getByRole('button', { name: layer, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(module.locator('.anatomy-overlay [data-part]').first()).toBeVisible();
  }
  await module.getByRole('group', { name: 'Estructuras anatómicas' }).getByRole('button', { name: 'Heart · Corazón', exact: true }).click();
  await expect(module.getByRole('heading', { name: 'Heart', exact: true })).toBeVisible();
  await expect(module.getByRole('button', { name: 'Escuchar Heart' })).toBeEnabled();
  await module.getByLabel('Opacidad de las ilustraciones').fill('50');
  await expect(module.locator('.anatomy-overlay')).toHaveAttribute('opacity', '0.5');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/medicine-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'test-results/medicine-desktop.png', fullPage: true });
});

test('camera denial shows recovery without leaving fake tracking on screen', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => { throw new DOMException('denied', 'NotAllowedError'); } });
  });
  await page.goto('/'); await page.getByRole('button', { name: 'Explorar anatomía' }).click();
  const module = page.getByRole('region', { name: 'Anatomía sobre cámara' });
  await module.getByRole('button', { name: 'Activar cámara', exact: true }).click();
  await expect(module.getByRole('alert')).toContainText('permiso');
  await expect(module.getByText('Demostración sin cámara', { exact: true })).toBeVisible();
  await expect(module.getByRole('button', { name: 'Activar cámara', exact: true })).toBeEnabled();
});

test('real local pose model follows a person, hides lost tracking and releases camera on navigation', async ({ page }) => {
  const fixtureUrl = `data:image/jpeg;base64,${(await readFile('tests/fixtures/pose.jpg')).toString('base64')}`;
  await page.addInitScript((imageUrl) => {
    const state = window as unknown as { poseBlank: boolean; poseShift: number; stoppedTracks: number };
    state.poseBlank = false; state.poseShift = 0; state.stoppedTracks = 0;

    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
      const canvas = document.createElement('canvas'); canvas.width = 1000; canvas.height = 667;
      const ctx = canvas.getContext('2d')!;
      const img = new Image(); img.src = imageUrl; await img.decode();
      const draw = () => { ctx.fillStyle = '#153b32'; ctx.fillRect(0, 0, 1000, 667); if (!state.poseBlank) ctx.drawImage(img, state.poseShift, 0); };
      draw(); const timer = window.setInterval(draw, 80);
      const stream = canvas.captureStream(12);
      for (const track of stream.getTracks()) {
        const stop = track.stop.bind(track);
        track.stop = () => { state.stoppedTracks++; clearInterval(timer); stop(); };
      }
      return stream;
    } });
  }, fixtureUrl);
  await page.goto('/'); await page.getByRole('button', { name: 'Explorar anatomía' }).click();
  const module = page.getByRole('region', { name: 'Anatomía sobre cámara' });
  await module.getByRole('button', { name: 'Activar cámara', exact: true }).click();
  await expect(module.locator('.anatomy-status')).toContainText('seguimiento activo', { timeout: 45000 });
  const shape = module.locator('[data-part=pectorals]');
  await expect(shape).toBeVisible();
  const initial = await shape.getAttribute('transform');
  await page.evaluate(() => { (window as unknown as { poseShift: number }).poseShift = 45; });
  const initialX = Number(initial!.slice(7, -1).split(' ')[4]);
  await expect.poll(async () => Number((await shape.getAttribute('transform'))!.slice(7, -1).split(' ')[4])).toBeGreaterThan(initialX + 25);
  const stageRatio = await module.locator('.anatomy-stage').evaluate(el => el.clientWidth / el.clientHeight);
  expect(stageRatio).toBeCloseTo(1000 / 667, 1);
  await page.screenshot({ path: 'test-results/medicine-tracking.png', fullPage: true });
  await page.evaluate(() => { (window as unknown as { poseBlank: boolean }).poseBlank = true; });
  await expect(module.locator('.anatomy-status')).toContainText('Buscando', { timeout: 15000 });
  await expect(module.locator('[data-part]')).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Navegación principal', exact: true }).getByRole('button', { name: 'Explorar', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { stoppedTracks: number }).stoppedTracks)).toBe(1);
  await page.evaluate(() => { (window as unknown as { poseBlank: boolean }).poseBlank = false; });
  await page.getByRole('button', { name: 'Explorar anatomía' }).click();
  await module.getByRole('button', { name: 'Activar cámara', exact: true }).click();
  await expect(module.getByRole('button', { name: 'Detener cámara' })).toBeVisible();
  await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { stoppedTracks: number }).stoppedTracks)).toBe(2);

});

test('model failure stops media and leaves the illustrated atlas available', async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as unknown as { modelStream: MediaStream; terminatedPoseWorker: boolean };
    window.Worker = class {
      onmessage: ((event: { data: unknown }) => void) | null = null;
      postMessage() { setTimeout(() => this.onmessage?.({ data: { type: 'error', message: 'test model unavailable' } }), 20); }
      terminate() { state.terminatedPoseWorker = true; }
    } as unknown as typeof Worker;
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
      canvas.getContext('2d')!.fillRect(0, 0, 640, 480);
      state.modelStream = canvas.captureStream(5); return state.modelStream;
    };
  });
  await page.goto('/'); await page.getByRole('button', { name: 'Explorar anatomía' }).click();
  const module = page.getByRole('region', { name: 'Anatomía sobre cámara' });
  await module.getByRole('button', { name: 'Activar cámara', exact: true }).click();
  await expect(module.getByRole('alert')).toContainText('seguimiento corporal');
  await expect(module.getByText('Demostración sin cámara', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { modelStream: MediaStream }).modelStream.getTracks().every(t => t.readyState === 'ended'))).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as unknown as { terminatedPoseWorker: boolean }).terminatedPoseWorker)).toBe(true);
  await module.getByRole('button', { name: 'Huesos', exact: true }).click();
  await expect(module.locator('[data-part=skull]')).toBeVisible();
});
