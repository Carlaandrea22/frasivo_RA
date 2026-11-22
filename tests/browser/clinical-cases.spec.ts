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
  for (const action of [
    'Assess and manage the airway.',
    'Assess breathing and ventilation.',
    'Assess circulation and control major bleeding.',
    'Assess neurological disability.',
    'Expose as needed and prevent hypothermia.',
  ]) await page.getByRole('button', { name: action }).click();
  await page.getByRole('button', { name: 'Comprobar orden' }).click();
  await expect(page.getByText('5 de 5 acciones en su posición')).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente caso' }).click();

  await expect(page.getByText('Caso 4 de 5')).toBeVisible();
  for (const action of [
    'Stay calm and remain with the person.',
    'Remove nearby objects that could cause injury.',
    'Cushion the head and loosen tight clothing around the neck.',
    'Turn the person gently onto one side.',
    'Time the seizure and seek emergency help when indicated.',
  ]) await page.getByRole('button', { name: action }).click();
  await page.getByRole('button', { name: 'Comprobar orden' }).click();
  await page.getByRole('button', { name: 'Siguiente caso' }).click();

  await expect(page.getByText('Caso 5 de 5')).toBeVisible();
  await page.getByRole('button', { name: 'Intramuscular adrenaline' }).click();
  await page.getByRole('button', { name: 'Comprobar respuesta' }).click();
  await expect(page.getByRole('heading', { name: 'Respuesta correcta' })).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente caso' }).click();

  await expect(page.getByRole('heading', { name: 'Completaste los cinco casos' })).toBeVisible();
  const practiceCount = await page.evaluate(() => Object.keys(localStorage)
    .filter(key => key.startsWith('lumar.progress:v1:event:')).length);
  expect(practiceCount).toBe(5);
});
