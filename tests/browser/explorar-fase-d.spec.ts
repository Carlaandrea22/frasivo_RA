import { expect, test, type Page } from '@playwright/test';

const fichas = [
  ['pectoralis_major', 'Pectoralis major'], ['trapezius', 'Trapezius'],
  ['rectus_abdominis', 'Rectus abdominis'], ['external_oblique', 'External abdominal oblique'],
  ['latissimus_dorsi', 'Latissimus dorsi'], ['gluteus_maximus', 'Gluteus maximus'],
  ['hamstrings', 'Hamstrings'], ['tibialis_anterior', 'Tibialis anterior'],
  ['sternocleidomastoid', 'Sternocleidomastoid'], ['diaphragm', 'Diaphragm'],
] as const;

const temas = [
  ['hombro-espalda-cuello', ['Porción clavicular', 'Porción descendente', 'Dorsal ancho', 'Esternocleidomastoideo']],
  ['abdomen-respiracion', ['Recto del abdomen', 'Oblicuo externo del abdomen', 'Desciende']],
  ['cadera-muslo-pierna', ['Glúteo mayor', 'Semitendinoso', 'Dorsiflexión del tobillo']],
] as const;

test.use({ viewport: { width: 375, height: 900 } });

async function escuchar(page: Page, termino: string, archivo: RegExp) {
  const audio = page.waitForResponse(response => archivo.test(response.url()) && response.ok());
  await page.getByRole('button', { name: `Escuchar ${termino}`, exact: true }).click();
  expect((await audio).headers()['content-type']).toContain('audio/');
}

test('Explorar encuentra las diez fichas musculares y sirve el audio del diafragma y de una parte', async ({ page }) => {
  await page.goto('/#explorar/musculos');
  const buscar = page.getByRole('searchbox', { name: 'Busca en español o inglés' });
  const catalogo = page.locator('.explorar-grid');
  for (const [id, termino] of fichas) {
    await buscar.fill(termino);
    const ficha = catalogo.getByRole('link').filter({ has: page.getByText(termino, { exact: true }) });
    await expect(ficha).toHaveAttribute('href', `#explorar/estructura/${id}`);
  }

  await buscar.fill('diafragma');
  await catalogo.getByRole('link', { name: 'Ver diafragma', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Modelo 3D de Diafragma' })).toHaveAttribute('data-viewer-state', 'ready');
  await escuchar(page, 'Diaphragm', /\/diaphragm-[\w-]+\.mp3$/);
  const partes = page.getByRole('group', { name: 'Seleccionar parte anatómica' });
  const centro = partes.getByRole('button', { name: 'Centro tendinoso', exact: true });
  await centro.click();
  await expect(centro).toHaveAttribute('aria-pressed', 'true');
  await escuchar(page, 'Central tendon of the diaphragm', /\/central-tendon-of-the-diaphragm-[\w-]+\.mp3$/);
});

test('Retos incluye los diez músculos y abre los recorridos desde la ficha del diafragma', async ({ page }) => {
  for (const ruta of ['ubicar', 'senalar']) {
    await page.goto(`/#practicar/retos/${ruta}`);
    const musculos = page.getByRole('combobox', { name: 'Modelo o recorrido' }).locator('optgroup[label="Músculos"]');
    for (const [id] of fichas) await expect(musculos.locator(`option[value="${id}"]`)).toHaveCount(1);
  }

  await page.goto('/#explorar/estructura/diaphragm');
  await page.getByRole('link', { name: 'Practicar esta estructura' }).click();
  await page.getByRole('link', { name: 'Elegir tema para Relaciona estructura y función' }).click();
  await expect(page.getByRole('combobox', { name: 'Tema' })).toHaveValue('funcion-abdomen-respiracion');
  await page.getByRole('link', { name: 'Volver a los retos' }).click();
  await page.getByRole('link', { name: 'Elegir tema para Repaso breve' }).click();
  await expect(page.getByRole('combobox', { name: 'Tema' })).toHaveValue('repaso-abdomen-respiracion');
  await page.getByRole('link', { name: 'Volver a los retos' }).click();
  await page.getByRole('link', { name: 'Elegir modelo para Señala la estructura' }).click();
  await expect(page.getByRole('combobox', { name: 'Modelo o recorrido' })).toHaveValue('diaphragm');
  await page.getByRole('button', { name: 'Empezar reto' }).click();
  await expect(page.getByRole('region', { name: 'Modelo 3D de Diafragma' })).toHaveAttribute('data-viewer-state', 'ready');
  await expect(page.getByRole('heading', { name: /^Toca:/ })).toBeVisible();
});

test('Repaso breve permite completar los tres temas musculares de la fase D', async ({ page }) => {
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
