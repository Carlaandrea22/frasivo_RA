import { expect, test } from '@playwright/test';

test('LumAR recorre sus secciones y subrutas a 375 px', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/#cuerpo');
  await expect(page).toHaveTitle(/LumAR/);
  const nav = page.getByRole('navigation', { name: 'Navegación principal' });
  const shot = async (name: string) => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
    await page.screenshot({ path: testInfo.outputPath(`${name}.png`) });
  };
  await expect(page.getByRole('button', { name: 'Activar cámara' })).toBeVisible();
  await shot('cuerpo');

  await nav.getByRole('button', { name: 'Explorar 3D' }).click();
  await page.getByRole('link', { name: /^Huesos \(/ }).click();
  await expect(page).toHaveURL(/#explorar\/huesos$/);
  const search = page.getByRole('searchbox', { name: 'Busca en español o inglés' });
  await search.fill('estructura inexistente');
  await expect(page.getByText(/No encontramos.*Prueba con otro nombre/)).toBeVisible();
  await search.fill('femur');
  await shot('catalogo');
  await page.getByRole('link', { name: /Ver fémur/i }).click();
  await expect(page).toHaveURL(/#explorar\/estructura\/femur$/);
  await expect(page.getByRole('heading', { name: 'Fémur', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Escuchar Femur' })).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('Cabeza del fémur', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Ver partes' }).click();
  const sheet = page.getByRole('dialog', { name: 'Partes anatómicas' });
  await expect(sheet.getByRole('button', { name: 'Escuchar Femoral head' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('video')).toHaveCount(0);
  await shot('explorar-3d');

  await nav.getByRole('button', { name: 'Practicar', exact: true }).click();
  await expect(page).toHaveURL(/#practicar$/);
  await shot('practicar');
  await page.getByRole('link', { name: 'Retos de anatomía', exact: true }).click();
  await expect(page).toHaveURL(/#practicar\/retos$/);
  await page.getByRole('link', { name: 'Elegir tema para Relaciona estructura y función' }).click();
  await expect(page).toHaveURL(/#practicar\/retos\//);
  await expect(page.getByRole('button', { name: 'Empezar reto' })).toBeVisible();
  await shot('retos');

  await page.getByRole('link', { name: 'Volver a los retos' }).click();
  await page.getByRole('link', { name: 'Casos clínicos', exact: true }).click();
  await expect(page).toHaveURL(/#practicar\/casos$/);
  await page.getByRole('link', { name: 'Ver caso de muestra' }).click();
  const caseUrl = page.url();
  await page.reload();
  await expect(page).toHaveURL(caseUrl);
  await expect(page.getByRole('heading', { name: 'Dolor al subir escaleras' })).toBeVisible();
  expect(await page.getByText(/dolor femoropatelar/i).count()).toBe(0);
  await shot('casos');

  await nav.getByRole('button', { name: 'Mi progreso' }).click();
  await expect(page).toHaveURL(/#progreso$/);
  await expect(page.getByRole('heading', { name: 'Mi progreso' })).toBeVisible();
  await expect(page.getByText('Contenido consultado · 1')).toBeVisible();
  await shot('progreso');
  await page.getByRole('link', { name: 'Mis prácticas' }).click();
  await expect(page).toHaveURL(/#progreso\/practicas$/);
  await expect(page.getByRole('heading', { name: 'Mis prácticas' })).toBeVisible();
  await shot('mis-practicas');
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Mi progreso' })).toBeVisible();

  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest.name).toBe('LumAR');
  expect(manifest.short_name).toBe('LumAR');
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).some(name => name.startsWith('lumar-')))).toBe(true);
  expect(errors).toEqual([]);
});

test('LumAR conserva la preferencia de Cuerpo y recupera el historial de Frasivo', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    localStorage.setItem('frasivo.body.controls-minimized', 'true');
    localStorage.setItem('frasivo-explore:v1', JSON.stringify({
      version: 1, points: 6, words: { femur: { attempts: 2, correct: 1 } },
    }));
  });
  await page.goto('/#cuerpo');
  await expect(page.getByRole('button', { name: 'Expandir controles' })).toBeVisible();
  await page.goto('/#mi-progreso');
  await expect(page.getByRole('heading', { name: 'Mi progreso' })).toBeVisible();
  await expect(page.getByText('6 puntos y 1 término con historial.')).toBeVisible();
  await expect(page.getByText('Contenido consultado · 0')).toBeVisible();
  await expect(page.getByText('Desempeños demostrados · 0')).toBeVisible();
  const metadata = await page.evaluate(() => JSON.parse(localStorage.getItem('lumar.progress:v1')!));
  expect(metadata.legacy.words.femur).toEqual({ attempts: 2, correct: 1 });
});
