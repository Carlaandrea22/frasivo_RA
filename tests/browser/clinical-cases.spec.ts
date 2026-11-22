import { expect, test } from '@playwright/test';

test('mantiene una conversación coherente, traduce solo la ronda actual y muestra el nivel', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0.99; });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/#practicar/casos');

  await page.getByRole('button', { name: 'Empezar sesión de 5 casos' }).click();
  await expect(page.getByText('Caso 1 de 5')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Entrevista · Dolor de rodilla' })).toBeVisible();

  await page.getByRole('button', { name: 'Pista' }).click();
  await expect(page.getByText('¿Cuándo empezó el dolor?')).toBeVisible();

  const onset = page.getByRole('button', { name: 'When did the pain begin?' });
  await onset.evaluate(button => {
    if (!(button instanceof HTMLElement)) throw new Error('Expected an HTML button');
    button.click();
    button.click();
  });
  await expect(page.getByRole('status', { name: 'Alex está escribiendo' })).toBeVisible();
  await expect(page.getByText('It began gradually about three weeks ago.')).toBeVisible();
  await expect(page.getByText('¿Cuándo empezó el dolor?')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Did you fall or twist your knee before it started?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Where exactly do you feel the pain?' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Did you fall or twist your knee before it started?' }).click();
  await expect(page.getByText('No. I do not remember any fall or sudden twist.')).toBeVisible();
  await page.getByRole('button', { name: 'Does your knee ever lock or get stuck?' }).click();
  await expect(page.getByText('No, I can bend and straighten it fully.')).toBeVisible();
  await expect(page.locator('.clinical-exchange')).toHaveCount(3);

  await page.getByRole('button', { name: 'Comenzar preguntas de comprensión' }).click();
  await expect(page.getByRole('heading', { name: 'Comprueba lo que entendiste' })).toBeVisible();
  await page.getByRole('button', { name: 'Pista' }).click();
  await expect(page.getByText('¿Qué respondió Alex?')).toBeVisible();
  await expect(page.getByText('Hace unas tres semanas')).toBeVisible();
  await page.getByRole('button', { name: 'About three weeks ago' }).click();
  await expect(page.getByText('¿Qué respondió Alex?')).toHaveCount(0);
  await page.getByRole('button', { name: 'There was no fall or sudden twist' }).click();
  await page.getByRole('button', { name: 'He could bend and straighten it' }).click();

  await expect(page.getByText('3 de 3 respuestas correctas')).toBeVisible();
  await expect(page.locator('.clinical-result[data-level="strong"]')).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente caso' }).click();
  await expect(page.getByText('Caso 2 de 5')).toBeVisible();

  const practices = await page.evaluate(() => Object.entries(localStorage)
    .filter(([key]) => key.startsWith('lumar.progress:v1:event:'))
    .map(([, value]) => JSON.parse(value))
    .filter(event => event.kind === 'practice'));
  expect(practices).toHaveLength(1);
  expect(practices[0]).toMatchObject({ activityId: 'knee-conversation', correct: 3, errors: 0, hints: 2 });

  await page.goto('/#progreso/practicas');
  await expect(page.getByRole('heading', { name: 'Entrevista · Dolor de rodilla' })).toBeVisible();
});

test('recorre las cinco modalidades de una sesión y conserva cada resultado', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0.99; });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/#practicar/casos');
  await page.getByRole('button', { name: 'Empezar sesión de 5 casos' }).click();

  await page.getByRole('button', { name: 'When did the pain begin?' }).click();
  await page.getByRole('button', { name: 'Did you fall or twist your knee before it started?' }).click();
  await page.getByRole('button', { name: 'Does your knee ever lock or get stuck?' }).click();
  await page.getByRole('button', { name: 'Comenzar preguntas de comprensión' }).click();
  await page.getByRole('button', { name: 'About three weeks ago' }).click();
  await page.getByRole('button', { name: 'There was no fall or sudden twist' }).click();
  await page.getByRole('button', { name: 'He could bend and straighten it' }).click();
  await page.getByRole('button', { name: 'Siguiente caso' }).click();

  await expect(page.getByText('Caso 2 de 5')).toBeVisible();
  await page.getByRole('button', { name: 'When did the discomfort begin?' }).click();
  await page.getByRole('button', { name: 'What new exercise did you start?' }).click();
  await page.getByRole('button', { name: 'How strong is it from zero to ten?' }).click();
  await page.getByRole('button', { name: 'Comenzar preguntas de comprensión' }).click();
  await page.getByRole('button', { name: 'Two days after changing the gym routine' }).click();
  await page.getByRole('button', { name: 'Heavier overhead presses' }).click();
  await page.getByRole('button', { name: 'Seven out of ten' }).click();
  await page.getByRole('button', { name: 'Siguiente caso' }).click();

  await expect(page.getByText('Caso 3 de 5')).toBeVisible();
  await page.getByRole('button', { name: 'Comprobar orden' }).click();
  await expect(page.getByText('5 de 5 posiciones resueltas sin ayuda')).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente caso' }).click();

  await expect(page.getByText('Caso 4 de 5')).toBeVisible();
  await page.getByRole('button', { name: 'Comprobar orden' }).click();
  await page.getByRole('button', { name: 'Siguiente caso' }).click();

  await expect(page.getByText('Caso 5 de 5')).toBeVisible();
  const selectedChoice = page.getByRole('button', { name: 'An oral antibiotic' });
  await selectedChoice.click();
  await expect(selectedChoice).toHaveAttribute('aria-pressed', 'true');
  await expect(selectedChoice).toHaveAttribute('data-selected', 'true');
  await page.getByRole('button', { name: 'Descartar una opción' }).click();
  await expect(page.getByRole('button', { name: 'Descartar una opción' })).toBeDisabled();
  await expect(page.getByRole('button', { name: /Paracetamol.*Opción descartada/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Intramuscular adrenaline' })).toBeEnabled();
  await page.getByRole('button', { name: 'Comprobar respuesta' }).click();
  await expect(page.getByRole('heading', { name: 'Respuesta para revisar' })).toBeVisible();
  await expect(page.locator('.clinical-result[data-level="review"]')).toBeVisible();
  await expect(page.getByText('1 pista utilizada')).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente caso' }).click();

  await expect(page.getByRole('heading', { name: 'Completaste los cinco casos' })).toBeVisible();
  await expect(page.getByText(/0 asistidas.*1 pista/)).toBeVisible();
  await expect(page.getByText('4 con buen dominio')).toBeVisible();
  await expect(page.getByText('0 en progreso')).toBeVisible();
  await expect(page.getByText('1 para repasar')).toBeVisible();
  const practiceCount = await page.evaluate(() => Object.keys(localStorage)
    .filter(key => key.startsWith('lumar.progress:v1:event:')).length);
  expect(practiceCount).toBe(5);
});

test('reordena tarjetas, fija una posición con pista y refleja la ayuda en el resultado', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.addInitScript(() => { Math.random = () => 0.99; });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/#practicar/casos');
  await page.getByRole('button', { name: 'Empezar sesión de 5 casos' }).click();

  await page.getByRole('button', { name: 'When did the pain begin?' }).click();
  await page.getByRole('button', { name: 'Did you fall or twist your knee before it started?' }).click();
  await page.getByRole('button', { name: 'Does your knee ever lock or get stuck?' }).click();
  await page.getByRole('button', { name: 'Comenzar preguntas de comprensión' }).click();
  await page.getByRole('button', { name: 'About three weeks ago' }).click();
  await page.getByRole('button', { name: 'There was no fall or sudden twist' }).click();
  await page.getByRole('button', { name: 'He could bend and straighten it' }).click();
  await page.getByRole('button', { name: 'Siguiente caso' }).click();

  await page.getByRole('button', { name: 'When did the discomfort begin?' }).click();
  await page.getByRole('button', { name: 'What new exercise did you start?' }).click();
  await page.getByRole('button', { name: 'How strong is it from zero to ten?' }).click();
  await page.getByRole('button', { name: 'Comenzar preguntas de comprensión' }).click();
  await page.getByRole('button', { name: 'Two days after changing the gym routine' }).click();
  await page.getByRole('button', { name: 'Heavier overhead presses' }).click();
  await page.getByRole('button', { name: 'Seven out of ten' }).click();
  await page.getByRole('button', { name: 'Siguiente caso' }).click();

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
  await expect(cards.first()).toHaveAttribute('data-locked', 'true');
  await expect(cards.first()).toContainText('Colocada con pista');

  await cards.nth(1).getByRole('button', { name: 'Mover abajo' }).click();
  await page.getByRole('button', { name: 'Comprobar orden' }).click();
  await expect(page.getByText('1 posición colocada con pista')).toBeVisible();
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
