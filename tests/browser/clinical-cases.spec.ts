import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0.99; });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/#practicar/casos');
});

const action = (page: Page, name: string | RegExp) =>
  page.getByRole('button', { name }).and(page.locator('button:not(.button--sound)'));
const choose = (page: Page, name: string | RegExp) => action(page, name).click();
const next = (page: Page) => choose(page, 'Siguiente caso');
const start = async (page: Page, kind: string) => {
  await choose(page, kind);
  await choose(page, 'Empezar práctica');
};

async function finishKneeInterview(page: Page) {
  await choose(page, 'Comenzar preguntas de comprensión');
  await choose(page, /Hace unas tres semanas/);
  await choose(page, /There was no fall or sudden twist/);
  await choose(page, /He could bend and straighten it/);
}

test('presenta preguntas, respuestas y mensajes en español con el inglés debajo', async ({ page }) => {
  await start(page, 'Practicar solo Conversación y comprensión');
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
  await expect(action(page, /Where exactly do you feel the pain/)).toHaveCount(0);
  await choose(page, /Did you fall or twist your knee before it started/);
  await choose(page, /Does your knee ever lock or get stuck/);
  await choose(page, 'Comenzar preguntas de comprensión');

  await expect(page.getByText('¿Qué respondió Alex?')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Cuándo empezó el dolor.*When did the pain begin/ })).toBeVisible();
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
  await start(page, 'Practicar solo Investigación clínica');
  await expect(page.getByText('Caso 1 de 2')).toBeVisible();
  await choose(page, /Tienes alguna enfermedad conocida/);
  await choose(page, /Has tomado algún medicamento nuevo/);
  await choose(page, /Te has tomado la temperatura/);
  await choose(page, 'Elegir una hipótesis');
  await page.getByText('Releer la conversación').click();
  await expect(page.getByText('Todavía no, no tengo termómetro en casa.')).toBeVisible();
  await choose(page, /Un efecto de un medicamento reciente/);
  await expect(page.getByRole('heading', { name: 'Revisa tu hipótesis' })).toBeVisible();
  await expect(page.getByText(/0 de 2 hallazgos clave/)).toBeVisible();
  await expect(page.getByText('Por qué encaja con el caso')).toHaveCount(0);
  await choose(page, 'Reintentar desde el primer turno');
  await expect(page.getByText('Turno 1 de 3')).toBeVisible();
  await expect(page.getByText('Todavía no, no tengo termómetro en casa.')).toHaveCount(0);

  await choose(page, /Crees que algo que comiste te cayó mal/);
  await choose(page, /Tu amiga comió lo mismo que tú/);
  await choose(page, /Has notado cambios al ir al baño/);
  await choose(page, 'Elegir una hipótesis');
  await choose(page, /Una posible enfermedad transmitida por alimentos/);
  await expect(page.getByRole('heading', { name: 'Hipótesis correcta' })).toBeVisible();
  await expect(page.getByText(/2 de 2 hallazgos clave.*1 de 1 punto/)).toBeVisible();
  const stomach = page.getByRole('region', { name: 'Modelo 3D · Estómago' });
  await expect(stomach).toHaveAttribute('data-viewer-state', 'ready', { timeout: 15000 });
  await expect(page.getByRole('region', { name: 'Anatomía del caso' })).toContainText('Cuerpo gástrico');
  await next(page);
  await expect(page.getByRole('heading', { name: 'Investigación · Dolor de cabeza' })).toBeVisible();
  await choose(page, /Qué estabas haciendo antes/);
  await choose(page, /Te diste algún golpe/);
  await choose(page, /Qué pasó justo antes del primer dolor/);
  await choose(page, 'Elegir una hipótesis');
  await choose(page, /Una posible lesión relacionada con el golpe/);
  await expect(page.getByRole('region', { name: 'Modelo 3D · Cerebro' })).toHaveAttribute('data-viewer-state', 'ready', { timeout: 15000 });
  await choose(page, 'Cráneo');
  await expect(page.getByRole('region', { name: 'Modelo 3D · Cráneo' })).toHaveAttribute('data-viewer-state', 'ready', { timeout: 15000 });
  await expect(page.getByRole('region', { name: 'Anatomía del caso' })).toContainText('Parietales');

  await page.goto('/#progreso/practicas');
  const entry = page.getByRole('article').filter({ hasText: 'Investigación · Dolor abdominal' });
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(entry.getByText('Resuelto en un reintento')).toBeVisible();
  await entry.getByText('Ruta de investigación').click();
  await expect(entry.getByText('¿Tu amiga comió lo mismo que tú?')).toBeVisible();
  await expect(entry.getByText(/Hipótesis elegida.*enfermedad transmitida por alimentos/)).toBeVisible();
  await expect(entry.getByText('¿Tienes alguna enfermedad conocida?')).toHaveCount(0);
});

test('Evaluación desactiva las pistas y corrige solo tras comprobar', async ({ page }) => {
  await choose(page, 'Practicar solo Ordenar actuaciones');
  await choose(page, 'Evaluación');
  await choose(page, 'Empezar práctica');
  await expect(page.getByRole('button', { name: 'Pista de orden' })).toHaveCount(0);
  await expect(page.getByRole('list', { name: 'Orden correcto' })).toHaveCount(0);
  await choose(page, 'Comprobar orden');
  await expect(page.getByRole('heading', { name: '3 de 5 posiciones correctas' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Orden correcto' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reintentar' })).toHaveCount(0);

  await choose(page, 'Salir');
  await start(page, 'Practicar solo Selección múltiple');
  await expect(page.getByRole('button', { name: 'Descartar una opción' })).toBeEnabled();
});

test('completa los cinco modos y muestra los resultados al finalizar', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 22, 12));
  await start(page, 'Configurar sesión mixta');
  await expect(page.getByText('Caso 1 de 5')).toBeVisible();
  await choose(page, /When did the pain begin/);
  await choose(page, /Did you fall or twist your knee before it started/);
  await choose(page, /Does your knee ever lock or get stuck/);
  await finishKneeInterview(page);
  await next(page);

  await choose(page, 'Comprobar orden');
  await expect(page.getByText('5 de 5 posiciones correctas')).toBeVisible();
  await expect(page.locator('.evaluation-confetti span').first()).toHaveCSS('animation-name', 'evaluation-confetti-fall');
  await next(page);

  const wrongChoice = action(page, 'An oral antibiotic');
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
  await choose(page, 'Caso de Alex');
  await choose(page, /Mareo por movimiento/);
  await choose(page, 'Caso de Mariana');
  await choose(page, /Dolor muscular tardío/);
  await choose(page, 'Caso de Juan');
  await choose(page, /Cafeína cerca de la hora de dormir/);
  await choose(page, 'Comprobar conexiones');
  await expect(page.getByRole('heading', { name: '3 de 3 conexiones correctas' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Siguiente caso' })).toHaveCount(0);
  await choose(page, 'Ver resultados');

  await expect(page.getByRole('heading', { name: 'Completaste los cinco casos' })).toBeVisible();
  await expect(page.getByText('92%')).toBeVisible();
  await expect(page.locator('.evaluation-confetti')).toBeVisible();
  const distribution = page.getByRole('list', { name: 'Distribución del desempeño' });
  await expect(distribution.getByRole('listitem')).toHaveCount(3);
  await expect(distribution).toContainText(/Buen dominio\s*4/);
  await expect(distribution).toContainText(/En progreso\s*0/);
  await expect(distribution).toContainText(/Para repasar\s*1/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.getByRole('link', { name: 'Ver mis prácticas' }).click();
  await expect(page.getByRole('article')).toHaveCount(5);
  await page.getByRole('link', { name: 'Mi progreso' }).click();
  await expect(page.getByText('1 día de racha')).toBeVisible();
  await expect(page.getByText('Meta de hoy completada')).toBeVisible();
  await expect(page.getByRole('heading', { name: '1 día de racha' })).toBeVisible();
  await expect(page.getByText('Casos clínicos realizados')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Prácticas por tipo de ejercicio' })).toBeVisible();
});

test('permite practicar un modo y mantiene visible la tarjeta durante el arrastre', async ({ page }) => {

  await start(page, 'Practicar solo Ordenar actuaciones');
  await expect(page.getByText('Caso 1 de 2')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Orden clínico · Evaluación inicial' })).toBeVisible();

  const cards = page.locator('.clinical-order-card');
  await expect(cards.first().locator('[lang="es"]')).toHaveText('Evalúa y asegura la vía aérea.');
  await expect(cards.first().locator('[lang="en"]')).toHaveText('Assess and manage the airway.');
  await cards.nth(1).scrollIntoViewIfNeeded();
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

test('tres pistas corrigen un orden sin aciertos y permiten obtener 5 de 5 sin confeti', async ({ page }) => {
  await start(page, 'Practicar solo Ordenar actuaciones');

  const firstCard = page.locator('.clinical-order-card').filter({ hasText: 'Assess and manage the airway.' });
  for (let step = 0; step < 4; step += 1) {
    await firstCard.getByRole('button', { name: 'Mover abajo' }).click();
  }
  const cards = page.locator('.clinical-order-card');
  await expect(cards.first()).toHaveAttribute('data-order-id', 'breathing');
  await expect(cards.last()).toHaveAttribute('data-order-id', 'airway');
  for (let hint = 0; hint < 3; hint += 1) {
    await page.getByRole('button', { name: 'Pista de orden' }).click();
  }
  await expect(page.getByText('Ya usaste todas las pistas disponibles.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pista de orden' })).toBeDisabled();
  await cards.first().getByRole('button', { name: 'Mover abajo' }).click();
  await page.getByRole('button', { name: 'Comprobar orden' }).click();
  await expect(page.getByRole('heading', { name: '5 de 5 posiciones correctas' })).toBeVisible();
  await expect(page.getByText(/2 sin ayuda.*3 con pistas.*0 para revisar/)).toBeVisible();
  await expect(page.locator('.clinical-result')).toHaveAttribute('data-level', 'strong');
  await expect(page.locator('.evaluation-confetti')).toHaveCount(0);
});

test('guarda un solo resultado aunque se reintente el orden', async ({ page }) => {
  await start(page, 'Practicar solo Ordenar actuaciones');
  const firstCard = page.locator('[data-order-id="airway"]');
  await firstCard.getByRole('button', { name: 'Mover abajo' }).click();
  await choose(page, 'Comprobar orden');
  await expect(page.getByText('3 de 5 posiciones correctas')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Orden correcto' })).toHaveCount(0);
  await choose(page, 'Reintentar');
  await firstCard.getByRole('button', { name: 'Mover arriba' }).click();
  await choose(page, 'Comprobar orden');
  await expect(page.getByText('5 de 5 posiciones correctas')).toBeVisible();
  await expect(page.locator('.evaluation-confetti')).toHaveCount(0);
  await next(page);
  await page.goto('/#progreso');
  await expect(page.getByText('Resuelto en un reintento')).toHaveCount(1);
  await expect(page.getByText('Calificaciones perfectas').locator('..')).toContainText('0%');
});

test('revelar el orden correcto cierra el intento', async ({ page }) => {
  await start(page, 'Practicar solo Ordenar actuaciones');
  await page.locator('[data-order-id="airway"]').getByRole('button', { name: 'Mover abajo' }).click();
  await choose(page, 'Comprobar orden');
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  await choose(page, 'Ver orden correcto');
  const solution = page.getByRole('list', { name: 'Orden correcto' });
  await expect(solution.getByRole('listitem').first()).toContainText('Evalúa y asegura la vía aérea.');
  await expect(page.getByRole('button', { name: 'Reintentar' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Siguiente caso' })).toBeEnabled();
});

test('permite revisar las respuestas que se fallaron en comprensión', async ({ page }) => {
  await start(page, 'Practicar solo Conversación y comprensión');
  await choose(page, /When did the pain begin/);
  await choose(page, /Did you fall or twist your knee before it started/);
  await choose(page, /Does your knee ever lock or get stuck/);
  await choose(page, 'Comenzar preguntas de comprensión');
  await page.locator('.clinical-answer-list .button--answer').nth(1).click();
  await choose(page, /There was no fall or sudden twist/);
  await choose(page, /He could bend and straighten it/);
  await expect(page.getByRole('heading', { name: '2 de 3 respuestas correctas' })).toBeVisible();
  await choose(page, 'Ver respuestas correctas');
  await expect(page.getByText('It began gradually about three weeks ago.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reintentar' })).toHaveCount(0);
  await expect(page.getByRole('list', { name: 'Preguntas para repasar' }).getByRole('listitem')).toHaveCount(1);
});

test('revela la respuesta de selección múltiple y permite terminar con un resultado para repasar', async ({ page }) => {
  await start(page, 'Practicar solo Selección múltiple');
  await choose(page, /An oral antibiotic/);
  await choose(page, 'Comprobar respuesta');
  await choose(page, 'Ver respuesta correcta');
  await expect(page.getByText('Adrenalina intramuscular', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reintentar' })).toHaveCount(0);
  await choose(page, 'Ver resultados');
  await expect(page.getByRole('heading', { name: 'Completaste la práctica' })).toBeVisible();
  await expect(page.locator('.evaluation-confetti')).toHaveCount(0);
});

test('usa un indicador compacto en la selección múltiple', async ({ page }) => {
  await start(page, 'Practicar solo Selección múltiple');
  const option = action(page, 'Intramuscular adrenaline');
  await expect(option.locator('[lang="es"]')).toHaveText('Adrenalina intramuscular');
  await expect(option.locator('[lang="en"]')).toHaveText('Intramuscular adrenaline');
  await expect(page.getByRole('heading', { name: /qué medicamento es el tratamiento.*first-line treatment/i })).toBeVisible();
  await option.click();
  const marker = await option.locator('.evaluation-option-marker').boundingBox();
  const copy = await option.locator('.evaluation-option-copy').boundingBox();
  expect(marker!.width).toBeLessThanOrEqual(28);
  expect(copy!.width).toBeGreaterThan(marker!.width * 5);
});

test('reordena tarjetas, fija una posición con pista y refleja la ayuda en el resultado', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await start(page, 'Practicar solo Ordenar actuaciones');

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
  await expect(page.getByRole('button', { name: 'Pista de orden' })).toBeEnabled();

  await cards.nth(2).getByRole('button', { name: 'Mover abajo' }).click();
  await page.getByRole('button', { name: 'Comprobar orden' }).click();
  await expect(page.getByText(/1 con pista/)).toBeVisible();
  await expect(page.locator('.clinical-result[data-level="partial"]')).toBeVisible();
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

test('la mascota baja la cabeza y cierra los ojos al mostrar un resultado bajo', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page, 'Practicar solo Selección múltiple');
  await choose(page, 'An oral antibiotic');
  await choose(page, 'Comprobar respuesta');
  await choose(page, 'Ver resultados');
  const mascota = page.locator('.evaluation-summary-mascot');
  await expect(mascota).toHaveAttribute('data-animacion', 'triste');
  await expect(mascota.locator('.mascota__gesto-triste')).toBeVisible();
  await expect(mascota.locator('.mascota__ojos')).toBeHidden();
  await expect(mascota.locator('.mascota__cabeza')).not.toHaveCSS('transform', 'none');
  await expect(mascota.locator('.mascota__cabeza')).toHaveCSS('animation-name', 'none');
});
