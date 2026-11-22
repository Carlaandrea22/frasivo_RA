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
  await expect(page.locator('.explorar-grid > article')).toHaveCount(4);
  await expect(page.locator('.explorar-grid').getByText('Provisional', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: `docs/capturas/carla/catalogo-organos-${width}.png`, fullPage: true });
  await page.getByRole('link', { name: /Ver corazón/i }).click();
  await expect(page.locator('[data-viewer-state="ready"]')).toBeVisible();
  await expect(page.locator('.explorar-parts button')).toHaveCount(15);
  const grupos = page.getByRole('group', { name: 'Grupos de etiquetas del corazón' });
  const siguiente = grupos.getByRole('button', { name: 'Siguiente grupo' });
  const etiquetas = page.locator('.explorar-atlas-label strong');
  const vistas = new Set<string>();
  for (const [grupo, cantidad] of [['Cámaras', 4], ['Válvulas', 4], ['Aorta y venas cavas', 3], ['Vasos pulmonares', 4]] as const) {
    await expect(grupos.getByRole('status')).toContainText(grupo);
    await expect(etiquetas).toHaveCount(cantidad);
    for (const nombre of await etiquetas.allTextContents()) vistas.add(nombre);
    await siguiente.click();
  }
  expect([...vistas].sort()).toEqual((await page.locator('.explorar-parts button').allTextContents()).sort());
  await expect(grupos.getByRole('status')).toContainText('Cámaras');
  const point = await page.locator('.explorar-leaders circle').first().evaluate(n => ({ x: Number(n.getAttribute('cx')), y: Number(n.getAttribute('cy')) }));
  await page.locator('canvas').click({ position: point });
  await expect(page.locator('.explorar-parts button[aria-pressed="true"]')).toHaveCount(1);
  const selected = page.locator('.explorar-parts').getByRole('button', { name: 'Válvula mitral', exact: true });
  await selected.click();
  await expect(selected).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('region', { name: 'Parte seleccionada' })).toContainText('Mitral valve');
  await expect(grupos.getByRole('status')).toContainText('Válvulas');
  await expect(page.locator('.explorar-atlas-label')).toHaveCount(4);
  await expect(page.locator('.explorar-atlas-label[aria-pressed="true"]')).toContainText('Válvula mitral');
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

test('las fichas ampliadas muestran sus partes y reproducen el audio del atlas', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  for (const [id, partCount] of [['pelvis', 4], ['patella', 3], ['biceps_brachii', 2], ['quadriceps_femoris', 4], ['lungs', 5]] as const) {
    await page.goto(`/#explorar/estructura/${id}`);
    await expect(page.locator('[data-viewer-state="ready"]')).toBeVisible();
    await expect(page.locator('.explorar-parts button')).toHaveCount(partCount);
    await page.locator('.explorar-parts button').last().click();
    await expect(page.getByRole('region', { name: 'Parte seleccionada' })).toBeVisible();
  }
  const response = page.waitForResponse(r => /left-lower-lobe.*\.mp3/.test(r.url()) && r.ok());
  await page.getByRole('button', { name: 'Escuchar Left lower lobe' }).click();
  expect((await response).headers()['content-type']).toContain('audio/');
});

test('las fichas nuevas se encuentran en el catálogo y se conectan al selector de práctica', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  const fichas = [
    ['huesos', 'cubito', 'Cúbito', 3], ['huesos', 'fibula', 'Peroné', 3], ['huesos', 'sternum', 'Esternón', 3],
    ['musculos', 'deltoid', 'Deltoides', 3], ['musculos', 'triceps', 'Tríceps braquial', 3], ['musculos', 'gastrocnemius', 'Gastrocnemio', 2],
    ['organos', 'stomach', 'Estómago', 4], ['organos', 'kidneys', 'Riñones', 2],
  ] as const;
  for (const [categoria, termino, nombre, partes] of fichas) {
    await page.goto(`/#explorar/${categoria}`);
    await page.getByRole('searchbox', { name: 'Busca en español o inglés' }).fill(termino);
    await page.getByRole('link', { name: `Ver ${nombre.toLowerCase()}`, exact: true }).click();
    await expect(page.locator('[data-viewer-state="ready"]')).toBeVisible();
    const botones = page.getByRole('group', { name: 'Seleccionar parte anatómica' }).getByRole('button');
    await expect(botones).toHaveCount(partes);
    await botones.first().click();
    await expect(page.getByRole('region', { name: 'Parte seleccionada' })).toBeVisible();
    await page.getByRole('link', { name: 'Practicar esta estructura' }).click();
    await expect(page.getByRole('link', { name: 'Elegir práctica' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Elegir modelo' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Elegir tema para Relaciona estructura y función' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Elegir tema para Repaso breve' })).toBeVisible();
  }
});

test('cada ficha del catálogo abre su nodo GLB y ofrece salida ante un ID desconocido', async ({ page }) => {
  for (const id of ['femur','tibia','humerus','radius','pelvis','patella','lungs','biceps_brachii','quadriceps_femoris']) {
    await page.goto(`/#explorar/estructura/${id}`);
    await expect(page.locator('[data-viewer-state="ready"]')).toBeVisible();
  }
  await page.goto('/#explorar/estructura/no-existe');
  await expect(page.getByRole('link', { name: 'Volver a Explorar 3D' })).toBeVisible();
});

for (const width of [375,1440]) test(`resalta solo la cabeza del fémur a ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/#explorar/estructura/femur');
  await expect(page.locator('[data-viewer-state="ready"]')).toBeVisible();
  await page.getByRole('button',{ name: 'Ocultar etiquetas' }).click();
  const before = await page.locator('canvas').screenshot();
  await page.locator('.explorar-parts').getByRole('button',{ name: 'Cabeza del fémur', exact: true }).click();
  const after = await page.locator('canvas').screenshot();
  const difference = await page.evaluate(async ({ before, after }) => {
    const read = async (base64: string) => {
      const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d')!; ctx.drawImage(image,0,0);
      return { width: canvas.width, height: canvas.height, pixels: ctx.getImageData(0,0,canvas.width,canvas.height).data };
    };
    const a = await read(before), b = await read(after);
    let top = 0, bottom = 0;
    for(let i = 0; i < a.pixels.length; i += 4) {
      const changed = [0,1,2].some(c => Math.abs(a.pixels[i+c]-b.pixels[i+c]) > 8);
      if(changed) { if(Math.floor(i/4/a.width) < a.height/2) top++; else bottom++; }
    }
    return { top, bottom };
  },{ before: before.toString('base64'), after: after.toString('base64') });
  expect(difference.top).toBeGreaterThan(30);
  expect(difference.bottom).toBe(0);
  await page.getByRole('button',{ name: 'Mostrar etiquetas' }).click();
  await page.evaluate(() => window.scrollTo(0,0));
  await page.screenshot({ path: `docs/capturas/carla/femur-region-${width}.png`, fullPage: true });
  await page.getByRole('button',{ name: 'Ver estructura completa', exact: true }).click();
  await expect(page.locator('.explorar-parts button[aria-pressed="true"]')).toHaveCount(0);
});
