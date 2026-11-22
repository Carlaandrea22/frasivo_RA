import { expect, test, type Page } from '@playwright/test';

const fichas = [
  ['clavicle', 'Clavicle'], ['scapula', 'Scapula'], ['ribs', 'Ribs'], ['mandible', 'Mandible'],
  ['hand', 'Bones of the right hand'], ['foot', 'Bones of the right foot'],
  ['cervical_vertebra', 'Typical cervical vertebra'], ['thoracic_lumbar_vertebrae', 'Typical thoracic and lumbar vertebrae'],
  ['sacrum', 'Sacrum and coccyx'], ['hyoid', 'Hyoid bone'],
] as const;

const temas = [
  ['hombro-torax', ['Extremo esternal', 'Cavidad glenoidea', 'Costillas flotantes']],
  ['mano-pie', ['Escafoides', 'Calcáneo']],
  ['cabeza-cuello-columna', ['Proceso condilar', 'Hioides', 'Forámenes transversos', 'Carillas costales', 'Cóccix']],
] as const;

test.use({ viewport: { width: 375, height: 900 } });

async function escuchar(page: Page, term: string, file: RegExp) {
  const audio = page.waitForResponse(response => file.test(response.url()) && response.ok());
  await page.getByRole('button', { name: `Escuchar ${term}`, exact: true }).click();
  expect((await audio).headers()['content-type']).toContain('audio/');
}

test('Explorar encuentra las diez fichas de la fase C y sirve las pronunciaciones de la clavícula', async ({ page }) => {
  await page.goto('/#explorar/huesos');
  const buscar = page.getByRole('searchbox', { name: 'Busca en español o inglés' });
  const catalogo = page.locator('.explorar-grid');
  for (const [id, termino] of fichas) {
    await buscar.fill(termino);
    const ficha = catalogo.getByRole('link').filter({ has: page.getByText(termino, { exact: true }) });
    await expect(ficha).toHaveAttribute('href', `#explorar/estructura/${id}`);
  }

  await buscar.fill('clavicula');
  await catalogo.getByRole('link', { name: 'Ver clavícula', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Modelo 3D de Clavícula' })).toHaveAttribute('data-viewer-state', 'ready');
  await escuchar(page, 'Clavicle', /\/clavicle-[\w-]+\.mp3$/);
  const partes = page.getByRole('group', { name: 'Seleccionar parte anatómica' });
  await expect(partes.getByRole('button')).toHaveCount(6);
  const extremoEsternal = partes.getByRole('button', { name: 'Extremo esternal izquierdo', exact: true });
  await extremoEsternal.click();
  await expect(extremoEsternal).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('region', { name: 'Parte seleccionada' })).toContainText('Left sternal end');
  await escuchar(page, 'Left sternal end', /\/left-sternal-end-[\w-]+\.mp3$/);
});

test('Retos incluye los diez modelos en Ubica y Señala y abre la práctica desde su ficha', async ({ page }) => {
  for (const ruta of ['ubicar', 'senalar']) {
    await page.goto(`/#practicar/retos/${ruta}`);
    const modelos = page.getByRole('combobox', { name: 'Modelo o recorrido' });
    const huesos = modelos.locator('optgroup[label="Huesos"]');
    for (const [id] of fichas) await expect(huesos.locator(`option[value="${id}"]`)).toHaveCount(1);
  }

  await page.goto('/#explorar/estructura/hyoid');
  await page.getByRole('link', { name: 'Practicar esta estructura' }).click();
  await page.getByRole('link', { name: 'Elegir tema para Relaciona estructura y función' }).click();
  await expect(page.getByRole('combobox', { name: 'Tema' })).toHaveValue('funcion-cabeza-cuello-columna');
  await page.getByRole('link', { name: 'Volver a los retos' }).click();
  await page.getByRole('link', { name: 'Elegir tema para Repaso breve' }).click();
  await expect(page.getByRole('combobox', { name: 'Tema' })).toHaveValue('repaso-cabeza-cuello-columna');
  await page.getByRole('link', { name: 'Volver a los retos' }).click();
  await page.getByRole('link', { name: 'Elegir modelo para Señala la estructura' }).click();
  await expect(page.getByRole('combobox', { name: 'Modelo o recorrido' })).toHaveValue('hyoid');
  await page.getByRole('button', { name: 'Empezar reto' }).click();
  await expect(page.getByRole('region', { name: 'Modelo 3D de Hioides' })).toHaveAttribute('data-viewer-state', 'ready');
  await expect(page.getByRole('heading', { name: /^Toca:/ })).toBeVisible();
});

test('Repaso breve permite elegir y completar los tres temas de huesos de la fase C', async ({ page }) => {
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
