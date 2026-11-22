import { expect, test } from '@playwright/test';

test('descarga por ficha y vuelve a abrir el modelo guardado sin conexión', async ({ page, context }) => {
  const requests = new Set<string>();
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (path.endsWith('.glb')) requests.add(path);
  });

  const downloadedModels = () => page.evaluate(async () => {
    const cache = await caches.open('lumar-downloads-v1');
    return (await cache.keys()).map(request => new URL(request.url).pathname).filter(path => path.endsWith('.glb'));
  });

  await page.goto('/#explorar');
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await expect(page.getByRole('heading', { name: 'Explorar 3D' })).toBeVisible();
  expect([...requests]).toEqual([]);
  expect(await downloadedModels()).toEqual([]);

  const viewer = page.locator('.viewer3d');
  await page.goto('/#explorar/estructura/femur');
  await expect(viewer).toHaveAttribute('data-viewer-state', 'ready');
  const first = await downloadedModels();
  expect(first).toHaveLength(1);

  await page.goto('/#explorar/estructura/skull');
  await expect(page.getByRole('heading', { name: 'Cráneo', exact: true }).first()).toBeVisible();
  await expect(viewer).toHaveAttribute('data-viewer-state', 'ready');
  const both = await downloadedModels();
  expect(both).toHaveLength(2);
  expect(both).toContain(first[0]);
  expect([...requests].sort()).toEqual(both.sort());

  await context.setOffline(true);
  await page.goto('/#explorar/estructura/femur');
  await page.reload();
  await expect(viewer).toHaveAttribute('data-viewer-state', 'ready');
  expect(await downloadedModels()).toHaveLength(2);
});
