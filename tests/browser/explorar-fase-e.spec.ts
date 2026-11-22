import { expect, test } from '@playwright/test';

const fichas = [
  ['pancreas', 'Pancreas'], ['spleen', 'Spleen'],
  ['gallbladder', 'Gallbladder'], ['esophagus', 'Esophagus'],
  ['trachea_bronchi', 'Trachea and main bronchi'], ['urinary_bladder', 'Urinary bladder'],
  ['larynx', 'Larynx'], ['adrenal_glands', 'Adrenal glands'],
  ['ureters', 'Ureters'], ['thymus', 'Thymus'],
] as const;

const temas = [
  ['digestion-superior', ['Cola', 'Conducto cístico', 'Porción torácica']],
  ['vias-respiratorias', ['Carina', 'Cartílago epiglótico']],
  ['via-urinaria', ['Trígono vesical', 'Pelvis renal', 'Sobre los riñones']],
  ['organos-linfoides', ['Hilio esplénico', 'Linfocitos T']],
] as const;

test.use({ viewport: { width: 375, height: 900 } });

test('Explorar encuentra las diez fichas de órganos y deja el audio de una parte disponible sin conexión', async ({ page, context }, testInfo) => {
  await page.goto('/#explorar/organos');
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const buscar = page.getByRole('searchbox', { name: 'Busca en español o inglés' });
  const catalogo = page.locator('.explorar-grid');
  for (const [id, termino] of fichas) {
    await buscar.fill(termino);
    const ficha = catalogo.getByRole('link').filter({ has: page.getByText(termino, { exact: true }) });
    await expect(ficha).toHaveAttribute('href', `#explorar/estructura/${id}`);
  }

  await buscar.fill('páncreas');
  await catalogo.getByRole('link', { name: 'Ver páncreas', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Modelo 3D de Páncreas' })).toHaveAttribute('data-viewer-state', 'ready');
  const partes = page.getByRole('group', { name: 'Seleccionar parte anatómica' });
  const cola = partes.getByRole('button', { name: 'Cola', exact: true });
  await cola.click();
  await expect(cola).toHaveAttribute('aria-pressed', 'true');
  const audio = page.waitForResponse(response => /\/tail-of-pancreas-[\w-]+\.mp3$/.test(response.url()) && response.ok());
  await page.getByRole('button', { name: 'Escuchar Tail of pancreas', exact: true }).click();
  const response = await audio;
  expect(response.headers()['content-type']).toContain('audio/');
  const audioUrl = response.url();
  expect(await page.evaluate(async url => {
    const cached = await caches.match(url, { cacheName: 'lumar-downloads-v1' });
    return cached?.status;
  }, audioUrl)).toBe(200);
  await page.screenshot({ path: testInfo.outputPath('pancreas-375.png'), fullPage: true });

  await context.setOffline(true);
  const offlineAudio = await page.evaluate(async url => {
    const clip = await fetch(url, { cache: 'no-store', headers: { Range: 'bytes=0-31' } });
    return { status: clip.status, type: clip.headers.get('content-type'), bytes: (await clip.arrayBuffer()).byteLength };
  }, audioUrl);
  expect(offlineAudio).toEqual({ status: 206, type: expect.stringContaining('audio/'), bytes: 32 });
});

test('Retos incluye los diez órganos y abre el reto de señalar desde una ficha', async ({ page }) => {
  for (const ruta of ['ubicar', 'senalar']) {
    await page.goto(`/#practicar/retos/${ruta}`);
    const organos = page.getByRole('combobox', { name: 'Modelo o recorrido' }).locator('optgroup[label="Órganos"]');
    for (const [id] of fichas) await expect(organos.locator(`option[value="${id}"]`)).toHaveCount(1);
  }

  await page.goto('/#explorar/estructura/gallbladder');
  await page.getByRole('link', { name: 'Practicar esta estructura' }).click();
  await page.getByRole('link', { name: 'Elegir tema para Relaciona estructura y función' }).click();
  await expect(page.getByRole('combobox', { name: 'Tema' })).toHaveValue('funcion-digestion-superior');
  await page.getByRole('link', { name: 'Volver a los retos' }).click();
  await page.getByRole('link', { name: 'Elegir modelo para Señala la estructura' }).click();
  await expect(page.getByRole('combobox', { name: 'Modelo o recorrido' })).toHaveValue('gallbladder');
  await page.getByRole('button', { name: 'Empezar reto' }).click();
  await expect(page.getByRole('region', { name: 'Modelo 3D de Vesícula biliar' })).toHaveAttribute('data-viewer-state', 'ready');
  await expect(page.getByRole('heading', { name: /^Toca:/ })).toBeVisible();
});

test('Repaso breve permite completar los cuatro temas de órganos de la fase E', async ({ page }) => {
  for (const [id, respuestas] of temas) {
    await page.goto('/#practicar/retos/repasar');
    await page.getByRole('combobox', { name: 'Tema' }).selectOption(`repaso-${id}`);
    await page.getByRole('button', { name: 'Evaluación', exact: true }).click();
    await page.getByRole('button', { name: 'Empezar reto' }).click();
    for (const [index, respuesta] of respuestas.entries()) {
      await page.getByRole('group', { name: 'Respuestas' }).getByRole('button', { name: respuesta, exact: true }).click();
      await page.getByRole('button', { name: index + 1 === respuestas.length ? 'Ver resultado' : 'Siguiente', exact: true }).click();
    }
    await expect(page.getByText(`${respuestas.length} de ${respuestas.length}`, { exact: true })).toBeVisible();
  }
});
