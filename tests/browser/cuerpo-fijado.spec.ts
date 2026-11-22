import { activateBodyCamera } from './body-camera';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { unzipSync } from 'three/addons/libs/fflate.module.js';

async function capturedBody(page: Page, quickLook = false) {
  const source = `data:image/jpeg;base64,${(await readFile('tests/fixtures/pose-front.jpg')).toString('base64')}`;
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(({ source, quickLook }) => {
    if (quickLook) {
      Object.defineProperty(navigator, 'userAgent', { value: 'iPhone' });
      const supports = DOMTokenList.prototype.supports;
      DOMTokenList.prototype.supports = function (token) {
        return token === 'ar' || supports.call(this, token);
      };
    }
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: async () => {
        const photo = new Image();
        photo.src = source;
        await photo.decode();
        const canvas = document.createElement('canvas');
        canvas.width = 560;
        canvas.height = 1040;
        const context = canvas.getContext('2d')!;
        const draw = () => {
          context.fillStyle = '#3f4b46';
          context.fillRect(0, 0, canvas.width, canvas.height);
          const scale = canvas.height / 925;
          context.drawImage(photo, 140, 65, 550, 925, (canvas.width - 550 * scale) / 2, 0, 550 * scale, canvas.height);
        };
        draw();
        const stream = canvas.captureStream(20);
        const timer = setInterval(draw, 50);
        const track = stream.getVideoTracks()[0];
        const stop = track.stop.bind(track);
        track.stop = () => { clearInterval(timer); stop(); };
        return stream;
      },
    });
  }, { source, quickLook });
  await page.goto('/#cuerpo');
  await activateBodyCamera(page);
  await expect(page.locator('.anatomy-status')).toHaveText('Cuerpo completo', { timeout: 30_000 });
}

const layers = [
  { layer: 'bones', name: 'Huesos', part: 'skull', other: 'heart', download: 'esqueleto.usdz' },
  { layer: 'muscles', name: 'Músculos', part: 'pectoralis_major', other: 'skull', download: 'musculos.usdz' },
  { layer: 'organs', name: 'Órganos', part: 'heart', other: 'skull', download: 'organos.usdz' },
] as const;

test('Cuerpo no recibe una invitación a práctica rápida', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 22, 8));
  await page.goto('/#explorar');
  await page.evaluate(() => { Math.random = () => .1; });
  const nav = page.getByRole('navigation', { name: 'Navegación principal' });
  const invitation = page.getByRole('button', { name: 'Aceptar práctica rápida' });
  await nav.getByRole('button', { name: 'Cuerpo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Activar cámara' })).toBeVisible();
  await expect(invitation).toHaveCount(0);
  await nav.getByRole('button', { name: 'Explorar 3D', exact: true }).click();
  await expect(invitation).toBeVisible();
});

test('cambia de capa con la pose fijada sobre la cámara, en el visor y en el USDZ', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await capturedBody(page, true);
  await page.getByRole('button', { name: /^Fijar/ }).click();
  const camera = page.locator('.anatomy-camera-skeleton');
  await expect(camera.locator('canvas')).toBeVisible({ timeout: 30_000 });
  await expect(camera).toHaveAttribute('data-calibration-max-px', /^\d/);
  const error = await camera.getAttribute('data-calibration-max-px');
  expect(Number(error)).toBeLessThan(24);
  testInfo.annotations.push({ type: 'error de proyección fijada', description: `${error} px en las tres capas` });
  await writeFile(testInfo.outputPath('error-proyeccion-px.txt'), `${error}\n`);
  const cameraCanvas = await camera.locator('canvas').elementHandle();
  await page.getByRole('button', { name: 'Etiquetas', exact: true }).click();
  await page.getByLabel('Etiquetas para el visor de Apple').selectOption('main');
  const checker = spawnSync('usdchecker', ['--help'], { encoding: 'utf8' });
  if (checker.error && (checker.error as NodeJS.ErrnoException).code !== 'ENOENT') throw checker.error;
  if (checker.error) testInfo.annotations.push({ type: 'USDZ', description: 'usdchecker no se encuentra en PATH' });

  for (const { layer, name, part, other, download } of layers) {
    await page.getByRole('group', { name: 'Capa anatómica' }).getByRole('button', { name }).click();
    await expect(camera).toHaveAttribute('data-layer', layer);
    await expect(camera).toHaveAttribute('data-calibration-max-px', error!);
    expect(await camera.locator('canvas').evaluate((canvas, previous) => canvas === previous, cameraCanvas)).toBe(true);
    await expect(page.locator(`[data-bone-label=${part}]`)).toBeVisible();
    const link = page.getByRole('link', { name: 'Ver en mi espacio' });
    await expect(link).toHaveAttribute('download', download, { timeout: 30_000 });
    await page.screenshot({ path: testInfo.outputPath(`fijado-${layer}.png`) });
    const asset = await link.evaluate(async node => {
      const blob = await (await fetch((node as HTMLAnchorElement).href)).blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    });
    expect(asset).toMatch(/^data:model\/vnd\.usdz\+zip;base64,/);
    const bytes = Buffer.from(asset.split(',')[1], 'base64');
    const entries = unzipSync(bytes);
    const stage = new TextDecoder().decode(entries['model.usda']);
    expect(stage).toContain(layer === 'bones' ? 'Posed_skeleton' : `Posed_${layer}`);
    expect(stage).toContain(`Label_${part}`);
    expect(stage).not.toContain(`Label_${other}`);
    const output = testInfo.outputPath(`${layer}.usdz`);
    await writeFile(output, bytes);
    if (!checker.error) {
      const result = spawnSync('usdchecker', ['--arkit', output], { encoding: 'utf8' });
      expect(result.status, result.error?.message || result.stderr || result.stdout).toBe(0);
    }
  }

  await page.getByRole('button', { name: 'Ver en 3D' }).click();
  const viewer = page.locator('.anatomy-fixed-stage');
  await expect(viewer.locator('canvas')).toBeVisible();
  await expect(viewer).toHaveAttribute('data-layer', 'organs');
  const viewerCanvas = await viewer.locator('canvas').elementHandle();
  await viewer.getByRole('button', { name: 'Etiquetas' }).click();
  for (const { layer, name, part, other, download } of layers) {
    await page.getByRole('group', { name: 'Capa anatómica' }).getByRole('button', { name }).click();
    await expect(viewer).toHaveAttribute('data-layer', layer);
    await expect(viewer.locator(`[data-bone-label=${part}]`)).toBeVisible();
    await expect(viewer.locator(`[data-bone-label=${other}]`)).toHaveCount(0);
    const toggleBottom = await viewer.getByRole('button', { name: 'Etiquetas' }).evaluate(toggle => toggle.getBoundingClientRect().bottom);
    const labelsTop = await viewer.locator('[data-bone-label]').evaluateAll(cards => Math.min(...cards.map(card => card.getBoundingClientRect().top)));
    expect(labelsTop).toBeGreaterThanOrEqual(toggleBottom);
    expect(await viewer.locator('canvas').evaluate((canvas, previous) => canvas === previous, viewerCanvas)).toBe(true);
    await expect(page.getByRole('link', { name: 'Ver en mi espacio' })).toHaveAttribute('download', download);
    await page.screenshot({ path: testInfo.outputPath(`fijado-visor-${layer}.png`) });
  }
  await page.getByRole('button', { name: 'Soltar' }).click();
  await expect(viewer).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Fijar/ })).toBeEnabled({ timeout: 30_000 });
});

for (const { layer, name } of layers.slice(1)) {
  test(`permite fijar directamente en ${name}`, async ({ page }) => {
    await capturedBody(page);
    await page.getByRole('group', { name: 'Capa anatómica' }).getByRole('button', { name }).click();
    await page.getByRole('button', { name: /^Fijar/ }).click();
    await expect(page.locator('.anatomy-camera-skeleton').locator('canvas')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.anatomy-camera-skeleton')).toHaveAttribute('data-layer', layer);
    if (layer === 'organs') {
      await page.getByRole('button', { name: 'Etiquetas', exact: true }).click();
      const arrow = page.locator('line[data-bone-arrow=heart]');
      await expect(arrow).toBeVisible();
      const tip = await arrow.evaluate(node => {
        const line = node as SVGLineElement;
        const point = new DOMPoint(line.x2.baseVal.value, line.y2.baseVal.value).matrixTransform(line.getScreenCTM()!);
        return { x: point.x, y: point.y };
      });
      await page.mouse.click(tip.x, tip.y);
      const detail = page.getByRole('dialog', { name: 'Corazón' });
      await expect(detail.getByText('Función')).toBeVisible();
      await expect(detail.getByRole('link', { name: 'Ver corazón en 3D' })).toHaveAttribute('href', '#explorar/estructura/heart');
      expect(await page.evaluate(() => Object.keys(localStorage).some(key => key.startsWith('lumar.progress:v1:event:')))).toBe(true);
    }
  });
}

test('cambia la capa en AR de Android y mantiene la sesión y su anclaje', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 22, 11, 50));
  await page.addInitScript(() => {
    const calls = { sessions: 0, anchors: 0, deleted: 0, reads: 0, hits: 0 };
    const space = {};
    const anchorSpace = {};
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    function transform(y: number, z: number) {
      const matrix = Float32Array.from(identity);
      matrix[13] = y;
      matrix[14] = z;
      return { matrix, position: { x: 0, y, z }, orientation: { x: 0, y: 0, z: 0, w: 1 } };
    }
    const projectionMatrix = [4, 0, 0, 0, 0, 2.2, 0, 0, 0, 0, -1.001, -1, 0, 0, -.04, 0];
    const floor = { transform: transform(0, 0) };
    const view = { transform: transform(.85, 3.8), projectionMatrix };
    const frame = {
      getViewerPose: () => ({ transform: view.transform, views: [view] }),
      getPose(reference: object) {
        if (reference === anchorSpace) calls.reads++;
        return floor;
      },
      getHitTestResults() {
        calls.hits++;
        return [{
          getPose: () => floor,
          async createAnchor() {
            calls.anchors++;
            return { anchorSpace, delete: () => { calls.deleted++; } };
          },
        }];
      },
    };
    const session = Object.assign(new EventTarget(), {
      enabledFeatures: ['hit-test', 'dom-overlay', 'anchors'],
      environmentBlendMode: 'alpha-blend',
      requestReferenceSpace: async () => space,
      requestHitTestSource: async () => ({ cancel() {} }),
      requestAnimationFrame: (callback: (time: number, data: typeof frame) => void) =>
        requestAnimationFrame(time => callback(time, frame)),
      cancelAnimationFrame,
      updateRenderState() {},
      async end() { session.dispatchEvent(new Event('end')); },
    });
    Object.assign(window, {
      testXR: { calls, select: () => session.dispatchEvent(new Event('select')) },
      XRWebGLLayer: class {
        framebuffer = null;
        framebufferWidth = 375;
        framebufferHeight = 812;
        getViewport() { return { x: 0, y: 0, width: this.framebufferWidth, height: this.framebufferHeight }; }
      },
    });
    Object.defineProperty(window, 'XRWebGLBinding', { value: undefined });
    Object.defineProperty(WebGL2RenderingContext.prototype, 'makeXRCompatible', { value: async () => {} });
    Object.defineProperty(navigator, 'userAgent', { value: 'Android' });
    Object.defineProperty(navigator, 'xr', { value: {
      async requestSession() { calls.sessions++; return session; },
    } });
  });
  const xr = () => page.evaluate(() => (window as unknown as {
    testXR: { calls: { sessions: number; anchors: number; deleted: number; reads: number; hits: number } };
  }).testXR.calls);
  await capturedBody(page);
  await page.clock.setFixedTime(new Date(2026, 10, 22, 12));
  await page.evaluate(async () => {
    window.dispatchEvent(new Event('focus'));
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  const reminder = page.getByRole('complementary', { name: 'Tu racha de hoy' });
  await expect(reminder).toHaveCount(0);
  await page.getByRole('button', { name: /^Fijar/ }).click();
  await expect(page.locator('.anatomy-camera-skeleton canvas')).toBeVisible();
  await expect(reminder).toHaveCount(0);
  await page.getByRole('button', { name: 'Ver en mi espacio' }).click();
  const overlay = page.locator('.anatomy-android-space');
  await expect(overlay.getByText('Apunta al piso', { exact: false })).toBeVisible({ timeout: 20_000 });
  await expect.poll(async () => (await xr()).hits).toBeGreaterThan(0);
  await page.evaluate(() => (window as unknown as { testXR: { select: () => void } }).testXR.select());
  await expect(overlay.getByRole('button', { name: 'Mover' })).toBeVisible();
  await expect(reminder).toHaveCount(0);
  await overlay.getByRole('button', { name: 'Etiquetas' }).click();
  const anchored = await xr();
  expect(anchored).toMatchObject({ sessions: 1, anchors: 1, deleted: 0 });
  for (const { name, part } of layers) {
    await overlay.getByRole('button', { name }).click();
    await expect(overlay.locator(`[data-bone-label=${part}]`)).toBeVisible();
    await expect(overlay.getByRole('button', { name: 'Mover' })).toBeVisible();
  }
  const switched = await xr();
  expect(switched).toMatchObject({ sessions: 1, anchors: 1, deleted: 0 });
  expect(switched.reads).toBeGreaterThan(anchored.reads);
  await overlay.getByRole('button', { name: 'Salir' }).click();
  await expect.poll(async () => (await xr()).deleted).toBe(1);
});
