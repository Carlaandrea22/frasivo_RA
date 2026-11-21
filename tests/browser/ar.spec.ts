import { expect, test, type Page } from '@playwright/test';
import type { RawRecognition } from '../../src/learning';

interface ARState { scene: RawRecognition[]; timer: number; stream: MediaStream; delay?: number; results: number }
async function controlledCamera(page: Page) {
  await page.addInitScript(() => {
    const state: ARState = { scene: [
      { label: 'chair', score: .9, box: { x: .06, y: .22, width: .2, height: .48 } },
      { label: 'chair', score: .85, box: { x: .66, y: .22, width: .2, height: .48 } },
      { label: 'bottle', score: .8, box: { x: .43, y: .6, width: .1, height: .3 } },
    ], timer: 0, stream: null!, results: 0 };
    (window as unknown as { arTest: ARState }).arTest = state;
    window.Worker = class {
      onmessage: ((event: { data: unknown }) => void) | null = null;
      onerror: unknown;
      stopped = false;
      postMessage(message: { type: string; frame?: ImageBitmap }) {
        message.frame?.close();
        const data = message.type === 'init' ? { type: 'ready', delegate: 'GPU' } : { type: 'results', inferenceMs: 20, detections: structuredClone(state.scene) };
        setTimeout(() => { if (!this.stopped) { if (message.type === 'frame') state.results++; this.onmessage?.({ data }); } }, state.delay ?? 20);
      }
      terminate() { this.stopped = true; clearInterval(state.timer); }
    } as unknown as typeof Worker;
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
      const ctx = canvas.getContext('2d')!;
      const draw = () => {
        ctx.fillStyle = '#d9e7d7'; ctx.fillRect(0, 0, 640, 480);
        for (const object of state.scene) {
          if (!object.box) continue;
          const b = object.box;
          ctx.fillStyle = object.label === 'chair' ? '#9b805a' : '#46766b';
          ctx.fillRect(b.x * 640, b.y * 480, b.width * 640, b.height * 480);
        }
      };
      draw(); state.timer = window.setInterval(draw, 40);
      state.stream = canvas.captureStream(25); return state.stream;
    };
  });
}

test('bilingual labels select one of two chairs and practice only its vocabulary', async ({ page }) => {
  await controlledCamera(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Activar cámara', exact: true }).click();
  await expect(page.locator('.ar-tag')).toHaveCount(3);
  const chairs = page.locator('.ar-tag[data-word-id="chair"]');
  await expect(chairs).toHaveCount(2);
  await expect(chairs.first()).toContainText('Chair');
  await expect(chairs.first()).toContainText('Silla');
  const rightId = await chairs.nth(1).getAttribute('data-track-id');
  await chairs.nth(1).focus(); await page.keyboard.press('Enter');
  await expect(page.locator(`.ar-tag[data-track-id="${rightId}"]`)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.ar-tag[aria-pressed="true"]')).toHaveCount(1);
  await expect(page.locator('.ar-selected-object')).toHaveAttribute('data-selected-track', rightId!);
  await expect(page.locator('.word-card h2')).toHaveText('Chair');
  await expect(page.locator('.word-card')).toContainText('Confianza actual: 85%');
  await expect(page.getByRole('button', { name: 'Escuchar Chair', exact: true })).toBeVisible();
  await expect(page.locator('.word-card .example')).toContainText('This is my chair.');
  await page.screenshot({ path: 'docs/ar-desktop.png', fullPage: true });
  await expect(page.locator('.session-word')).toHaveCount(2);
  await page.getByRole('button', { name: 'Practicar Chair', exact: true }).click();
  await expect(page.locator('.practice-top')).toContainText('1 de 3');
  await page.locator('.answer-option').filter({ hasText: 'Chair' }).click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await page.getByLabel('Palabra en inglés').fill('chair');
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await page.locator('.answer-option').filter({ hasText: 'Silla' }).click();
  await page.getByRole('button', { name: 'Ver resumen', exact: true }).click();
  await expect(page.locator('.summary-stats')).toContainText('30');
  await expect(page.locator('.summary-stats')).toContainText('100%');
});

test('keeps a selected label stable when individual analyses take 600 ms', async ({ page }) => {
  await controlledCamera(page);
  await page.goto('/');
  await page.evaluate(() => { (window as unknown as { arTest: ARState }).arTest.delay = 600; });
  await page.getByRole('button', { name: 'Activar cámara', exact: true }).click();
  await expect(page.locator('.ar-tag')).toHaveCount(3);
  const id = await page.locator('.ar-tag[data-word-id="chair"]').nth(1).getAttribute('data-track-id');
  const selected = page.locator(`.ar-tag[data-track-id="${id}"]`);
  await selected.click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { arTest: ARState }).arTest.results)).toBeGreaterThanOrEqual(3);
  await expect(selected).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.ar-selected-object')).toHaveAttribute('data-selected-track', id!);
});

test.describe('etiquetas móviles', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  test('touch selection survives movement and expires only the missing object', async ({ page }) => {
    await controlledCamera(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Activar cámara', exact: true }).click();
    await expect(page.locator('.ar-tag')).toHaveCount(3);
    const bounds = await page.locator('.viewfinder').evaluate(element => {
      const parent = element.getBoundingClientRect();
      return [...element.querySelectorAll('.ar-tag')].map(tag => {
        const r = tag.getBoundingClientRect();
        return { inside: r.left >= parent.left && r.right <= parent.right && r.top >= parent.top && r.bottom <= parent.bottom, height: r.height };
      });
    });
    expect(bounds.every(b => b.inside && b.height >= 44)).toBe(true);
    const rightId = await page.locator('.ar-tag[data-word-id="chair"]').nth(1).getAttribute('data-track-id');
    const right = page.locator(`.ar-tag[data-track-id="${rightId}"]`);
    const leftBefore = await right.evaluate(element => (element as HTMLElement).style.left);
    await right.tap();
    await expect(page.locator('.word-card')).toBeInViewport();
    await page.screenshot({ path: 'docs/ar-mobile.png', fullPage: true });
    await expect(right).toHaveAttribute('aria-pressed', 'true');
    await page.evaluate(() => {
      const state = (window as unknown as { arTest: ARState }).arTest;
      state.scene = [
        { label: 'chair', score: .95, box: { x: .63, y: .24, width: .2, height: .48 } },
        { label: 'chair', score: .8, box: { x: .08, y: .22, width: .2, height: .48 } },
        { label: 'bottle', score: .8, box: { x: .43, y: .6, width: .1, height: .3 } },
      ];
    });
    await expect.poll(() => right.evaluate(element => (element as HTMLElement).style.left)).not.toBe(leftBefore);
    await expect(right).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.ar-tag')).toHaveCount(3);
    await page.evaluate(() => {
      const state = (window as unknown as { arTest: ARState }).arTest;
      state.scene = state.scene.filter(object => object.label !== 'chair' || object.box!.x < .5);
    });
    await expect(right).toHaveCount(0, { timeout: 2000 });
    await expect(page.locator('.ar-tag')).toHaveCount(2);
    await expect(page.locator('.ar-selected-object')).toHaveCount(0);
    await expect(page.locator('.object-state')).toContainText('salió de la vista');
    await expect(page.locator('.word-card h2')).toHaveText('Chair');
    await page.getByRole('button', { name: 'Volver a la cámara', exact: true }).click();
    await expect(page.locator('.viewfinder')).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
});
