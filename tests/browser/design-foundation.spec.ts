import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('la navegación de móvil abre las cuatro secciones y llega a Créditos desde Mi progreso', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Navegación principal' });
  const body = page.getByRole('region', { name: 'Cámara corporal' });
  await expect(body).toBeVisible();
  await expect(nav.getByRole('button', { name: 'Cuerpo' })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('button')).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  const buttons = await page.getByRole('button').evaluateAll(elements =>
    elements.map(element => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })),
  );
  expect(buttons.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);
  expect((await nav.boundingBox())!.y + (await nav.boundingBox())!.height).toBe(812);
  await nav.getByRole('button', { name: 'Explorar 3D' }).click();
  await expect(page.getByRole('heading', { name: 'Explorar 3D' })).toBeVisible();
  await nav.getByRole('button', { name: 'Practicar' }).click();
  await expect(page.getByRole('heading', { name: 'Practicar' })).toBeVisible();
  await nav.getByRole('button', { name: 'Mi progreso' }).click();
  await page.getByRole('button', { name: 'Créditos' }).click();
  await expect(page.getByRole('heading', { name: 'Créditos' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Mi progreso' })).toBeVisible();
});

test('las capas y la opacidad responden y el botón tiene presión, foco y movimiento reducido', async ({ page }) => {
  await page.goto('/');
  const bone = page.getByRole('button', { name: 'Huesos', exact: true });
  await page.keyboard.press('Tab');
  await expect(bone).toBeFocused();
  await expect(bone).toHaveCSS('outline-style', 'solid');

  const muscles = page.getByRole('button', { name: 'Músculos', exact: true });
  await muscles.hover();
  await page.mouse.down();
  await expect(muscles).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 3)');
  await expect(muscles).toHaveCSS('box-shadow', 'none');
  await page.mouse.up();
  await expect(muscles).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.anatomy-overlay')).toHaveClass(/layer-muscles/);

  await page.getByRole('button', { name: 'Órganos', exact: true }).click();
  await expect(page.locator('[data-part=heart]')).toBeVisible();
  const opacity = page.getByRole('slider', { name: 'Opacidad' });
  await opacity.focus();
  await page.keyboard.press('Home');
  await expect(page.locator('.anatomy-overlay')).toHaveAttribute('opacity', '0.2');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(muscles).toHaveCSS('transition-duration', '0s');
});

test('el permiso denegado mantiene el atlas de demostración y permite reintentar', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Activar cámara' }).click();
  await expect(page.getByRole('alert')).toContainText('permiso de cámara');
  await expect(page.getByRole('button', { name: 'Activar cámara' })).toBeEnabled();
  await expect(page.locator('[data-part=skull]')).toBeVisible();
});

test('Pose Lite detecta sin conexión tras la primera carga y libera la cámara al salir', async ({ page, context }) => {
  const fixtureUrl = `data:image/jpeg;base64,${(await readFile('tests/fixtures/pose.jpg')).toString('base64')}`;
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(imageUrl => {
    const state = { blank: false, stops: 0, workerStops: 0 };
    Object.assign(window, { poseTest: state });
    const terminate = Worker.prototype.terminate;
    Worker.prototype.terminate = function () {
      state.workerStops++;
      terminate.call(this);
    };
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1000;
        canvas.height = 667;
        const context = canvas.getContext('2d')!;
        const photo = new Image();
        photo.src = imageUrl;
        await photo.decode();
        const draw = () => {
          context.fillStyle = '#153b32';
          context.fillRect(0, 0, canvas.width, canvas.height);
          if (!state.blank) context.drawImage(photo, 0, 0);
        };
        draw();
        const timer = window.setInterval(draw, 80);
        const stream = canvas.captureStream(12);
        const track = stream.getVideoTracks()[0];
        const stop = track.stop.bind(track);
        track.stop = () => {
          state.stops++;
          clearInterval(timer);
          stop();
        };
        return stream;
      },
    });
  }, fixtureUrl);

  await page.goto('/');
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Músculos', exact: true }).click();
  await page.getByRole('button', { name: 'Activar cámara' }).click();
  const status = page.getByRole('status');
  await expect(status).toHaveText('Persona detectada', { timeout: 45000 });
  await expect(page.locator('[data-part=pectorals]')).toBeVisible();
  const frameRatio = await page.locator('.anatomy-frame').evaluate(element => {
    const bounds = element.getBoundingClientRect();
    return bounds.width / bounds.height;
  });
  expect(frameRatio).toBeCloseTo(1000 / 667, 2);
  await page.evaluate(() => { (window as unknown as { poseTest: { blank: boolean } }).poseTest.blank = true; });
  await expect(status).toHaveText('Buscando una persona', { timeout: 15000 });
  await expect(page.locator('[data-part]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Explorar 3D' }).click();
  await expect.poll(() => page.evaluate(() => {
    const { stops, workerStops } = (window as unknown as { poseTest: { stops: number; workerStops: number } }).poseTest;
    return { stops, workerStops };
  })).toEqual({ stops: 1, workerStops: 1 });
});

test('la pronunciación se muestra deshabilitada cuando falta la voz del dispositivo', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'speechSynthesis', { value: undefined }));
  await page.goto('/');
  await page.getByText('Vocabulario de la capa', { exact: true }).click();
  const sound = page.getByRole('button', { name: 'Escuchar Skull' });
  await expect(sound).toBeDisabled();
  await expect(sound).toHaveCSS('box-shadow', 'none');
  await expect(page.getByRole('heading', { name: 'Skull' })).toBeVisible();
});

test('el atlas y los controles superpuestos siguen fijos al abrir la hoja móvil', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const stage = page.locator('.anatomy-stage');
  const before = (await stage.boundingBox())!;
  const controls = (await page.locator('.anatomy-controls').boundingBox())!;
  expect(before.height).toBeGreaterThan(812 * .78);
  expect(controls.y).toBeGreaterThan(before.y);
  expect(controls.y + controls.height).toBeLessThan(before.y + before.height);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(812);

  const current = page.getByRole('button', { name: 'Cuerpo' });
  const inactive = page.getByRole('button', { name: 'Explorar 3D' });
  await expect(current).toHaveAttribute('aria-current', 'page');
  await expect(current).toHaveCSS('background-color', 'rgb(23, 100, 84)');
  await expect(current).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(inactive).not.toHaveAttribute('aria-current');

  const trigger = page.getByRole('button', { name: 'Vocabulario de la capa' });
  await trigger.click();
  const sheet = page.getByRole('dialog', { name: 'Vocabulario de la capa' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('heading', { name: 'Skull' })).toBeVisible();
  expect(await stage.boundingBox()).toEqual(before);
  expect((await sheet.boundingBox())!.y + (await sheet.boundingBox())!.height).toBe(812);

  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await stage.boundingBox()).toEqual(before);
});

test('el service worker reserva el WASM de compatibilidad para el primer uso', async ({ page, context }) => {
  const wasm = '/body-tracking/wasm/vision_wasm_internal.wasm';
  const fallback = ['/body-tracking/wasm/vision_wasm_nosimd_internal.js', '/body-tracking/wasm/vision_wasm_nosimd_internal.wasm'];
  await page.goto('/');
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const cached = async (path: string) => page.evaluate(async url => Boolean(await caches.match(url)), path);

  expect(await cached(wasm)).toBe(true);
  for (const path of fallback) {
    expect(await cached(path)).toBe(false);
    expect(await page.evaluate(async url => (await fetch(url)).ok, path)).toBe(true);
    expect(await cached(path)).toBe(true);
  }

  await context.setOffline(true);
  for (const path of fallback) {
    expect(await page.evaluate(async url => (await fetch(url, { cache: 'reload' })).ok, path)).toBe(true);
  }
});
