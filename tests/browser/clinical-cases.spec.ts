import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0.99; });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/#practicar/casos');
});

const choose = (page: Page, name: string | RegExp) => page.getByRole('button', { name }).click();
const next = (page: Page) => choose(page, 'Siguiente caso');

async function finishKneeInterview(page: Page) {
  await choose(page, 'Comenzar preguntas de comprensión');
  await choose(page, /Hace unas tres semanas/);
  await choose(page, /There was no fall or sudden twist/);
  await choose(page, /He could bend and straighten it/);
}

test('presenta preguntas, respuestas y mensajes en español con el inglés debajo', async ({ page }) => {
  await choose(page, 'Practicar solo Conversación y comprensión');
  const chat = page.getByRole('region', { name: 'Conversación con Alex' });
  await expect(chat.getByText('Me duele la rodilla derecha cada vez que me pongo en cuclillas.')).toBeVisible();
  await expect(chat.getByText('My right knee hurts whenever I squat.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pista', exact: true })).toHaveCount(0);
  const openingQuestion = page.getByRole('button', { name: /Cuándo empezó el dolor.*When did the pain begin/ });
  const spanish = await openingQuestion.locator('[lang="es"]').boundingBox();
  const english = await openingQuestion.locator('[lang="en"]').boundingBox();
  expect(english!.y).toBeGreaterThanOrEqual(spanish!.y + spanish!.height);
  await openingQuestion.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page.getByRole('status', { name: 'Alex está escribiendo' })).toBeVisible();
  await expect(chat.getByText('It began gradually about three weeks ago.')).toBeVisible();
  await expect(chat.locator('.clinical-message--patient [lang="es"]').last()).toContainText(/tres semanas/);
  await expect(chat.locator('.clinical-message--student [lang="es"]')).toHaveText('¿Cuándo empezó el dolor?');
  await expect(page.getByRole('button', { name: /Where exactly do you feel the pain/ })).toHaveCount(0);
  await choose(page, /Did you fall or twist your knee before it started/);
  await choose(page, /Does your knee ever lock or get stuck/);
  await choose(page, 'Comenzar preguntas de comprensión');

  await expect(page.getByRole('heading', { name: /Qué respondió Alex/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pista', exact: true })).toHaveCount(0);
  const answer = page.getByRole('button', { name: /Hace unas tres semanas.*About three weeks ago/ });
  const spanishAnswer = await answer.locator('[lang="es"]').boundingBox();
  const englishAnswer = await answer.locator('[lang="en"]').boundingBox();
  expect(englishAnswer!.y).toBeGreaterThanOrEqual(spanishAnswer!.y + spanishAnswer!.height);
  await answer.click();
  await choose(page, /There was no fall or sudden twist/);
  await choose(page, /He could bend and straighten it/);
  await expect(page.getByRole('heading', { name: '3 de 3 respuestas correctas' })).toBeVisible();
  await next(page);

  await page.goto('/#progreso/practicas');
  const entry = page.getByRole('article').filter({ hasText: 'Entrevista · Dolor de rodilla' });
  await expect(entry).toHaveCount(1);
  await expect(entry.getByRole('list', { name: 'Resultado' })).toContainText(/3\s*aciertos/);
  await expect(entry.getByText(/pista/)).toHaveCount(0);
});

test('la investigación permite seguir una ruta débil, reiniciar y guardar solo el camino elegido', async ({ page }) => {
  await choose(page, 'Practicar solo Investigación clínica');
  await expect(page.getByText('Caso 1 de 2')).toBeVisible();
  await choose(page, /Tienes alguna enfermedad conocida/);
  await choose(page, /Has tomado algún medicamento nuevo/);
  await choose(page, /Te has tomado la temperatura/);
  await choose(page, 'Elegir una hipótesis');
  await page.getByText('Releer la conversación').click();
  await expect(page.getByText('Todavía no, no tengo termómetro en casa.')).toBeVisible();
  await choose(page, /Una posible enfermedad transmitida por alimentos/);
  await expect(page.getByRole('heading', { name: 'Revisa tu camino' })).toBeVisible();
  await expect(page.getByText(/0 de 2 hallazgos clave/)).toBeVisible();
  await choose(page, 'Volver al primer turno');
  await expect(page.getByText('Turno 1 de 3')).toBeVisible();
  await expect(page.getByText('Todavía no, no tengo termómetro en casa.')).toHaveCount(0);

  await choose(page, /Crees que algo que comiste te cayó mal/);
  await choose(page, /Tu amiga comió lo mismo que tú/);
  await choose(page, /Has notado cambios al ir al baño/);
  await choose(page, 'Elegir una hipótesis');
  await choose(page, /Una posible enfermedad transmitida por alimentos/);
  await expect(page.getByRole('heading', { name: 'Investigación bien orientada' })).toBeVisible();
  await expect(page.getByText(/2 de 2 hallazgos clave.*Hipótesis respaldada/)).toBeVisible();
  await next(page);
  await expect(page.getByRole('heading', { name: 'Investigación · Dolor de cabeza' })).toBeVisible();

  await page.goto('/#progreso/practicas');
  const entry = page.getByRole('article').filter({ hasText: 'Investigación · Dolor abdominal' });
  await expect(page.getByRole('article')).toHaveCount(1);
  await entry.getByText('Ruta de investigación').click();
  await expect(entry.getByText('¿Tu amiga comió lo mismo que tú?')).toBeVisible();
  await expect(entry.getByText(/Hipótesis elegida.*enfermedad transmitida por alimentos/)).toBeVisible();
  await expect(entry.getByText('¿Tienes alguna enfermedad conocida?')).toHaveCount(0);
});

test('completa los cuatro modos en cinco casos y dibuja cuadrados según el desempeño', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 22, 12));
  await choose(page, 'Empezar sesión de 5 casos');
  await expect(page.getByText('Caso 1 de 5')).toBeVisible();
  await choose(page, /When did the pain begin/);
  await choose(page, /Did you fall or twist your knee before it started/);
  await choose(page, /Does your knee ever lock or get stuck/);
  await finishKneeInterview(page);
  await next(page);

  await choose(page, 'Comprobar orden');
  await expect(page.getByText('5 de 5 posiciones correctas')).toBeVisible();
  await next(page);

  const wrongChoice = page.getByRole('button', { name: 'An oral antibiotic' });
  await wrongChoice.click();
  await expect(wrongChoice).toHaveAttribute('aria-pressed', 'true');
  await choose(page, 'Descartar una opción');
  await expect(page.getByRole('button', { name: /Paracetamol.*Opción descartada/ })).toBeDisabled();
  await choose(page, 'Comprobar respuesta');
  await expect(page.getByRole('heading', { name: 'Respuesta para revisar' })).toBeVisible();
  await next(page);

  await choose(page, /Crees que algo que comiste te cayó mal/);
  await choose(page, /Qué otros síntomas has tenido/);
  await choose(page, /Te has tomado la temperatura/);
  await choose(page, 'Elegir una hipótesis');
  await choose(page, /Una posible enfermedad transmitida por alimentos/);
  await next(page);

  await expect(page.getByText('Caso 5 de 5')).toBeVisible();
  await choose(page, /When did the discomfort begin/);
  await choose(page, /What new exercise did you start/);
  await choose(page, /How strong is it from zero to ten/);
  await choose(page, 'Comenzar preguntas de comprensión');
  await choose(page, /Two days after changing the gym routine/);
  await choose(page, /Heavier overhead presses/);
  await choose(page, /Seven out of ten/);
  await next(page);

  await expect(page.getByRole('heading', { name: 'Completaste los cinco casos' })).toBeVisible();
  const tiles = page.getByRole('list', { name: 'Distribución del desempeño' });
  await expect(tiles.getByRole('listitem')).toHaveCount(3);
  await expect(tiles).toContainText(/3\s*con buen dominio/);
  await expect(tiles).toContainText(/1\s*en progreso/);
  await expect(tiles).toContainText(/1\s*para repasar/);
  const boxes = await tiles.getByRole('listitem').evaluateAll(elements => elements.map(element => {
    const { width, height, right } = element.getBoundingClientRect();
    return { width, height, right, color: getComputedStyle(element).backgroundColor };
  }));
  expect(boxes[0].width).toBeGreaterThan(boxes[1].width);
  expect(new Set(boxes.map(box => box.color)).size).toBe(3);
  for (const box of boxes) {
    expect(box.width).toBeCloseTo(box.height, 0);
    expect(box.right).toBeLessThanOrEqual(375);
  }
  await page.getByRole('link', { name: 'Ver mis prácticas' }).click();
  await expect(page.getByRole('article')).toHaveCount(5);
  await page.getByRole('link', { name: 'Mi progreso' }).click();
  await expect(page.getByText('1 día de racha')).toBeVisible();
  await expect(page.getByText('Meta de hoy completada')).toBeVisible();
});

test('permite practicar un modo y mantiene visible la tarjeta durante el arrastre', async ({ page }) => {

  await page.getByRole('button', { name: 'Practicar solo Ordenar actuaciones' }).click();
  await expect(page.getByText('Caso 1 de 2')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Orden clínico · Evaluación inicial' })).toBeVisible();

  const cards = page.locator('.clinical-order-card');
  const firstText = await cards.first().locator('p').boundingBox();
  const secondCard = await cards.nth(1).boundingBox();
  if (!firstText || !secondCard) throw new Error('Ordering cards must have measurable positions');
  await page.mouse.move(firstText.x + 12, firstText.y + firstText.height / 2);
  await page.mouse.down();
  await page.mouse.move(secondCard.x + secondCard.width / 2, secondCard.y + secondCard.height / 2, { steps: 4 });
  await expect(cards.first()).toHaveAttribute('data-dragging', 'true');
  await expect(cards.nth(1)).toHaveAttribute('data-drop-target', 'true');
  const heldTransform = await cards.first().evaluate(card => getComputedStyle(card).transform);
  expect(heldTransform).not.toBe('none');
  await page.mouse.up();
  await expect(cards.first()).toContainText('Assess breathing and ventilation.');
});

test('muestra las pistas agotadas y cuenta como correctas las posiciones asistidas', async ({ page }) => {
  await page.getByRole('button', { name: 'Practicar solo Ordenar actuaciones' }).click();

  const firstCard = page.locator('.clinical-order-card').filter({ hasText: 'Assess and manage the airway.' });
  for (let step = 0; step < 4; step += 1) {
    await firstCard.getByRole('button', { name: 'Mover abajo' }).click();
  }
  for (let hint = 0; hint < 3; hint += 1) {
    await page.getByRole('button', { name: 'Pista de orden' }).click();
  }
  await expect(page.getByText('Ya usaste todas las pistas disponibles.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pista de orden' })).toBeDisabled();
  await page.getByRole('button', { name: 'Comprobar orden' }).click();
  await expect(page.getByRole('heading', { name: '3 de 5 posiciones correctas' })).toBeVisible();
  await expect(page.getByText(/0 sin ayuda.*3 con pistas.*2 para revisar/)).toBeVisible();
});

test('usa un indicador compacto en la selección múltiple', async ({ page }) => {
  await page.getByRole('button', { name: 'Practicar solo Selección múltiple' }).click();
  const option = page.getByRole('button', { name: 'Intramuscular adrenaline' });
  await option.click();
  const marker = await option.locator('.clinical-choice-marker').boundingBox();
  const copy = await option.locator('.clinical-choice-copy').boundingBox();
  expect(marker!.width).toBeLessThanOrEqual(28);
  expect(copy!.width).toBeGreaterThan(marker!.width * 5);
});

test('reordena tarjetas, fija una posición con pista y refleja la ayuda en el resultado', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await choose(page, 'Practicar solo Ordenar actuaciones');

  const cards = page.locator('.clinical-order-card');
  await expect(cards).toHaveCount(5);
  await expect(cards.first().getByLabel('Arrastrar acción')).toBeVisible();
  const dragHandle = cards.first().getByLabel('Arrastrar acción');
  const source = await dragHandle.boundingBox();
  const target = await cards.nth(1).boundingBox();
  if (!source || !target) throw new Error('Ordering cards must have measurable positions');
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 4 });
  await page.mouse.up();
  await expect(cards.first()).toContainText('Assess breathing and ventilation.');

  await page.getByRole('button', { name: 'Pista de orden' }).click();
  await expect(cards.first()).toContainText('Assess and manage the airway.');
  const assistedCard = cards.filter({ hasText: 'Colocada con pista' });
  await expect(assistedCard).toHaveCount(1);
  await expect(assistedCard).toHaveAttribute('data-locked', 'true');

  await cards.nth(2).getByRole('button', { name: 'Mover abajo' }).click();
  await page.getByRole('button', { name: 'Comprobar orden' }).click();
  await expect(page.getByText(/1 con pista/)).toBeVisible();
  await expect(page.locator('.clinical-result[data-level="review"]')).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente caso' }).click();
  const orderingPractice = await page.evaluate(() => Object.entries(localStorage)
    .filter(([key]) => key.startsWith('lumar.progress:v1:event:'))
    .map(([, value]) => JSON.parse(value))
    .find(event => event.activityId === 'primary-assessment-order'));
  expect(orderingPractice).toMatchObject({ assisted: 1, hints: 1 });
  await page.goto('/#progreso/practicas');
  await expect(page.getByText(/1 asistida/)).toBeVisible();
  expect(consoleErrors).toEqual([]);
});
