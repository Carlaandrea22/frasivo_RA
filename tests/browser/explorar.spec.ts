import { expect, test } from '@playwright/test';

for (const width of [375, 1440]) test(`Explorar: catálogo y corazón a ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/#explorar/organos');
  const search = page.getByRole('searchbox', { name: 'Busca en español o inglés' });
  await search.fill('HEART');
  await expect(page.getByRole('link', { name: /Ver corazón/i })).toBeVisible();
  await search.fill('no-existe');
  await expect(page.getByRole('button', { name: 'Limpiar búsqueda' })).toBeVisible();
  await page.getByRole('button', { name: 'Limpiar búsqueda' }).click();
  await expect(page.locator('.explorar-grid > article')).toHaveCount(2);
  await page.screenshot({ path: `docs/capturas/carla/catalogo-organos-${width}.png`, fullPage: true });
  await page.getByRole('link', { name: /Ver corazón/i }).click();
  await expect(page.locator('[data-viewer-state="ready"]')).toBeVisible();
  await expect(page.locator('.explorar-parts button')).toHaveCount(15);
  const point = await page.locator('.explorar-leaders circle').first().evaluate(n => ({ x: Number(n.getAttribute('cx')), y: Number(n.getAttribute('cy')) }));
  await page.locator('canvas').click({ position: point });
  await expect(page.locator('.explorar-parts button[aria-pressed="true"]')).toHaveCount(1);
  const selected = page.locator('.explorar-parts').getByRole('button', { name: 'Válvula mitral', exact: true });
  await selected.click();
  await expect(selected).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('region', { name: 'Parte seleccionada' })).toContainText('Mitral valve');
  await expect(page.locator('.explorar-atlas-label')).toHaveCount(width === 375 ? 6 : 12);
  await page.getByRole('button', { name: 'Ocultar etiquetas' }).click();
  await expect(page.locator('.explorar-atlas-label')).toHaveCount(0);
  await page.getByRole('button', { name: 'Mostrar etiquetas' }).click();
  await page.locator('canvas').focus();
  await page.keyboard.press('ArrowLeft');
  await page.getByRole('button', { name: 'Acercar', exact: true }).click();
  await page.getByRole('button', { name: 'Restablecer vista' }).click();
  await page.evaluate(() => window.scrollTo(0,0));
  await page.screenshot({ path: `docs/capturas/carla/corazon-${width}.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-viewer-state="ready"]')).toBeVisible();
  const consultations = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('lumar.progress:v1:event:')).map(k => JSON.parse(localStorage[k])).filter(e => e.kind === 'consultation'));
  expect(consultations.length).toBeGreaterThan(0);
});

test('cada ficha del catálogo abre su nodo GLB y ofrece salida ante un ID desconocido', async ({ page }) => {
  for (const id of ['femur','tibia','humerus','radius','pelvis','patella','lungs','biceps_brachii','quadriceps_femoris']) {
    await page.goto(`/#explorar/estructura/${id}`);
    await expect(page.locator('[data-viewer-state="ready"]')).toBeVisible();
  }
  await page.goto('/#explorar/estructura/no-existe');
  await expect(page.getByRole('link', { name: 'Volver a Explorar 3D' })).toBeVisible();
});
