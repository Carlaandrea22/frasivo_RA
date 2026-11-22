import { expect, test, type Page } from '@playwright/test';

type AudioLog = { started: string[]; active: string | null };
const audio = (page: Page) => page.evaluate(() => Reflect.get(window, 'evaluationAudio') as AudioLog);
const listen = (page: Page, term: string) => page.getByRole('button', { name: `Escuchar ${term}`, exact: true });

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    Math.random = () => .99;
    const log = { started: [] as string[], active: null as string | null };
    Reflect.set(window, 'evaluationAudio', log);
    const start = (text: string) => { log.started.push(text); log.active = text; };
    HTMLMediaElement.prototype.play = function () {
      start(new URL(this.src).pathname);
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () { log.active = null; };
    Object.defineProperties(window.speechSynthesis, {
      speak: { value: (utterance: SpeechSynthesisUtterance) => start(utterance.text) },
      cancel: { value: () => { log.active = null; } },
    });
  });
});

test('lee la consigna de Señala sin poner nombres en las piezas numeradas', async ({ page }) => {
  await page.goto('/#practicar/retos/corazon-3d');
  await page.getByRole('button', { name: 'Empezar reto', exact: true }).click();
  await expect(listen(page, 'Aorta')).toBeVisible();
  await expect(listen(page, 'Mitral valve')).toHaveCount(0);
  expect((await audio(page)).started).toEqual([]);
  await listen(page, 'Aorta').click();
  expect((await audio(page)).active).toMatch(/aorta.*\.mp3$/i);
  await page.getByRole('button', { name: 'Mostrar números para seleccionar' }).click();
  await expect(page.getByRole('button', { name: 'Pieza 1', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Comprobar', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Salir', exact: true }).click();
  await page.getByRole('link', { name: 'Salir del reto' }).click();
  await expect.poll(async () => (await audio(page)).active).toBeNull();
});

test('lee por igual las opciones de Repaso y detiene el audio al comprobar y avanzar', async ({ page }) => {
  await page.goto('/#practicar/retos/repaso-musculos');
  await page.getByRole('button', { name: 'Empezar reto', exact: true }).click();
  const prompt = page.getByRole('heading', { name: '¿Qué músculo ayuda a flexionar el codo?' });
  await expect(prompt).toBeVisible();
  const answers = page.getByRole('group', { name: 'Respuestas' });
  await expect(answers.getByRole('button', { name: /^Escuchar / })).toHaveCount(3);
  await expect(listen(page, 'Biceps brachii')).toHaveCount(1);
  await listen(page, 'Biceps brachii').click();
  expect((await audio(page)).active).toMatch(/biceps-brachii.*\.mp3$/i);
  const check = page.getByRole('button', { name: 'Comprobar', exact: true });
  await expect(check).toBeDisabled();
  await answers.getByRole('button', { name: 'Cuádriceps femoral', exact: true }).click();
  await check.click();
  await expect.poll(async () => (await audio(page)).active).toBeNull();
  const correction = page.locator('.retos-feedback');
  await correction.getByRole('button', { name: 'Escuchar Biceps brachii', exact: true }).click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect.poll(async () => (await audio(page)).active).toBeNull();
  await answers.getByRole('button', { name: 'Recto femoral', exact: true }).click();
  await check.click();
  await page.getByRole('button', { name: 'Ver resultado', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Resultado del reto', exact: true })).toBeVisible();
  await expect(listen(page, 'Biceps brachii')).toBeVisible();
});

test('escuchar el diálogo no pregunta al paciente y el audio se corta al cambiar de turno o salir', async ({ page }) => {
  await page.goto('/#practicar/casos');
  await page.getByRole('button', { name: 'Practicar solo Conversación y comprensión' }).click();
  await page.getByRole('button', { name: 'Empezar práctica', exact: true }).click();
  const question = 'When did the pain begin?';
  const second = 'Where exactly do you feel the pain?';
  expect((await audio(page)).started).toEqual([]);
  await listen(page, question).click();
  expect((await audio(page)).active).toBe(question);
  await expect(page.getByText('Turno 1 de 3')).toBeVisible();
  await expect(page.locator('.clinical-message--student')).toHaveCount(0);
  await listen(page, second).click();
  expect(await audio(page)).toEqual({ started: [question, second], active: second });
  await page.getByRole('button', { name: /Cuándo empezó el dolor.*When did the pain begin/ }).click();
  await expect.poll(async () => (await audio(page)).active).toBeNull();
  await expect(page.getByText('Turno 2 de 3')).toBeVisible();
  const reply = 'It began gradually about three weeks ago.';
  await listen(page, reply).click();
  expect((await audio(page)).active).toBe(reply);
  await page.getByRole('button', { name: 'Salir', exact: true }).click();
  await expect.poll(async () => (await audio(page)).active).toBeNull();
});

test('escuchar una tarjeta del emparejamiento no crea ni marca conexiones', async ({ page }) => {
  await page.goto('/#practicar/casos/modo/matching');
  const cause = 'Motion sickness';
  await listen(page, cause).click();
  expect((await audio(page)).active).toBe(cause);
  await expect(page.getByText('0 de 3 conexiones')).toBeVisible();
  await expect(page.getByRole('button', { name: /Mareo por movimiento.*Motion sickness/ })).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});

test('la corrección clínica pronuncia la solución después de comprobar', async ({ page }) => {
  await page.goto('/#practicar/casos');
  await page.getByRole('button', { name: 'Practicar solo Selección múltiple' }).click();
  await page.getByRole('button', { name: 'Empezar práctica', exact: true }).click();
  await page.getByRole('button', { name: /^Un antibiótico por vía oral/ }).click();
  await page.getByRole('button', { name: 'Comprobar respuesta', exact: true }).click();
  const solution = listen(page, 'Intramuscular adrenaline');
  await expect(solution).toHaveCount(0);
  await page.getByRole('button', { name: 'Ver respuesta correcta', exact: true }).click();
  await solution.click();
  expect((await audio(page)).active).toBe('Intramuscular adrenaline');
  await page.getByRole('button', { name: 'Ver resultados', exact: true }).click();
  await expect.poll(async () => (await audio(page)).active).toBeNull();
});
