import { createServer } from 'node:http';
import { readdir, readFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { devices, expect, test } from '@playwright/test';

const mobile = { width: 375, height: 812 };
const evidence = process.env.LUMAR_PWA_SCREENSHOTS;

test.describe('instalación en iPhone', () => {
  test.use({ userAgent: devices['iPhone SE'].userAgent, isMobile: true, hasTouch: true, viewport: mobile });

  test('explica cómo agregar LumAR a la pantalla de inicio', async ({ page }) => {
    await page.goto('/');
    const install = page.getByRole('button', { name: 'Instalar LumAR' });
    await expect(install).toBeVisible();
    if (evidence) await page.screenshot({ path: `${evidence}/pwa-instalar-375.png` });
    await install.click();
    const sheet = page.getByRole('dialog', { name: 'Instalar LumAR' });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText(/Compartir/)).toBeVisible();
    await expect(sheet.getByText('Añadir a pantalla de inicio', { exact: true })).toBeVisible();
    await expect(sheet.getByText(/Abrir como app web/)).toBeVisible();
    if (evidence) await page.screenshot({ path: `${evidence}/pwa-instalar-iphone-375.png` });
    await sheet.getByRole('button', { name: 'Cerrar' }).click();
    await expect(sheet).toBeHidden();
    await expect(install).toBeFocused();
  });

  test('oculta el control en la app instalada de iPhone', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Activar cámara' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Instalar LumAR' })).toHaveCount(0);
  });
});

test('usa el prompt de Chromium tras un gesto y oculta el control al instalar', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Activar cámara' }).waitFor();
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, {
      prompt: async () => {
        document.documentElement.dataset.nativeInstall = 'invocado';
      },
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    });
    window.dispatchEvent(event);
  });
  const install = page.getByRole('button', { name: 'Instalar LumAR' });
  await expect(install).toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute('data-native-install', 'invocado');
  await install.click();
  await expect(page.locator('html')).toHaveAttribute('data-native-install', 'invocado');
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  await expect(install).toHaveCount(0);
});

test('instala interfaz, Pose Lite y Huesos bajo 20 MB y difiere el resto', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const installed = await page.evaluate(async () => {
    const name = (await caches.keys()).find(key => key.startsWith('lumar-shell-'))!;
    const cache = await caches.open(name);
    const requests = await cache.keys();
    const sizes = await Promise.all(requests.map(async request => (await (await cache.match(request))!.blob()).size));
    return { urls: requests.map(request => new URL(request.url).pathname), bytes: sizes.reduce((a, b) => a + b, 0) };
  });
  expect(installed.bytes).toBeLessThanOrEqual(20_000_000);
  expect(installed.urls).toContain('/');
  expect(installed.urls).toContain('/apple-touch-icon.png');
  expect(installed.urls).toContain('/favicon.ico');
  expect(installed.urls).toContain('/body-tracking/pose_landmarker_lite.task');
  expect(installed.urls.some(url => /\/skull-[\w-]+\.webp$/.test(url))).toBe(true);
  expect(installed.urls.some(url => /\/skull_back-[\w-]+\.webp$/.test(url))).toBe(true);
  expect(installed.urls.filter(url => url.endsWith('.glb')).map(url => url.split('/').at(-1)?.split('-')[0]))
    .toEqual(['bones', 'foot', 'hand', 'head']);
  expect(installed.urls.join('\n')).not.toMatch(/pose_landmarker_full|hand_landmarker|face_landmarker|pectoralis_major|small_intestine/);
  await context.setOffline(true);
  expect(await page.evaluate(async () => {
    const response = await fetch('/body-tracking/wasm/vision_wasm_internal.wasm');
    const binary = await response.arrayBuffer();
    return response.headers.get('Content-Type') === 'application/wasm' && WebAssembly.validate(binary);
  })).toBe(true);
});

test('espera una acción para actualizar y conserva los recursos descargados', async ({ baseURL, page, context }) => {
  await page.setViewportSize(mobile);
  let version = 1;
  const worker = await readFile('dist/sw.js', 'utf8');
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url!, baseURL);
      if (url.pathname === '/sw.js') {
        const script = version === 1 ? worker : worker.replace(/const NAME = "([^"]+)";/, 'const NAME = "$1-update";');
        response.setHeader('Content-Type', 'text/javascript');
        response.setHeader('Cache-Control', 'no-store');
        response.end(script);
        return;
      }
      const upstream = await fetch(url);
      response.statusCode = upstream.status;
      response.setHeader('Content-Type', upstream.headers.get('Content-Type') || 'application/octet-stream');
      response.setHeader('Cache-Control', 'no-store');
      if (url.pathname === '/' || url.pathname === '/index.html') {
        response.end((await upstream.text()).replace('<html ', `<html data-pwa-build="${version}" `));
      } else {
        response.end(Buffer.from(await upstream.arrayBuffer()));
      }
    } catch (error) {
      response.statusCode = 500;
      response.end(String(error));
    }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));

  try {
    const { port } = server.address() as AddressInfo;
    const origin = `http://127.0.0.1:${port}`;
    await page.goto(origin);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await page.evaluate(() => { window.location.hash = 'creditos'; });
    const row = (label: RegExp) => page.getByRole('listitem').filter({ hasText: label });
    await expect(row(/Interfaz, Huesos y Pose Lite/)).toContainText('Disponible');
    await expect(row(/Músculos/)).toContainText('Pendiente');
    await page.getByRole('button', { name: 'Cuerpo', exact: true }).click();
    await page.getByRole('button', { name: 'Músculos', exact: true }).click();
    const muscles = await page.locator('image[data-part="pectoralis_major_left"]').getAttribute('href');
    expect(muscles).toMatch(/pectoralis_major_left/);
    await page.waitForFunction(url => caches.match(url!), muscles);
    const model = '/body-tracking/hand_landmarker.task';
    const organ = `/assets/${(await readdir('dist/assets')).find(file => /^liver-.*\.webp$/.test(file))}`;
    const legacyAsset = await (await context.request.get(`${origin}${organ}`)).body();
    await page.evaluate(async ({ model, organ, legacyAsset }) => {
      // Reproduce an existing download written by the tracking worker.
      const cache = await caches.open('body-hand-landmarker-v1');
      await cache.add(model);
      // Reproduce an optional overlay saved by the legacy precache policy.
      const legacy = await caches.open('lumar-000000000001');
      await legacy.put(organ, new Response(Uint8Array.from(legacyAsset), { headers: { 'Content-Type': 'image/webp' } }));
      localStorage.setItem('pwa-test-retained', 'guardado');
    }, { model, organ, legacyAsset: [...legacyAsset] });
    await page.evaluate(() => { window.location.hash = 'creditos'; });
    await expect(row(/Músculos/)).toContainText('Disponible');
    await expect(row(/Seguimiento de manos/)).toContainText('Disponible');
    await expect(row(/Órganos/)).toContainText('Pendiente');
    await page.getByRole('button', { name: 'Cuerpo', exact: true }).click();

    version = 2;
    await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
    const update = page.getByRole('button', { name: 'Actualizar', exact: true });
    await expect(update).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-pwa-build', '1');
    expect(await page.evaluate(async () => (await navigator.serviceWorker.ready).waiting?.state)).toBe('installed');
    await page.goto(`${origin}/?before-update=1`);
    await expect(page.locator('html')).toHaveAttribute('data-pwa-build', '1');
    await expect(update).toBeVisible();
    if (evidence) await page.screenshot({ path: `${evidence}/pwa-actualizar-375.png` });

    await context.setOffline(true);
    await update.click();
    await expect(page.locator('html')).toHaveAttribute('data-pwa-build', '2');
    await expect(update).toHaveCount(0);
    expect(await page.evaluate(async ({ muscles, model, organ }) => ({
      layer: (await fetch(muscles!)).ok,
      model: Boolean(await caches.match(model)),
      migrated: Boolean(await caches.match(organ, { cacheName: 'lumar-downloads-v1' })),
      progress: localStorage.getItem('pwa-test-retained'),
    }), { muscles, model, organ })).toEqual({ layer: true, model: true, migrated: true, progress: 'guardado' });
    await page.evaluate(() => { window.location.hash = 'creditos'; });
    await expect(row(/Músculos/)).toContainText('Disponible');
    await expect(row(/Seguimiento de manos/)).toContainText('Disponible');
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
