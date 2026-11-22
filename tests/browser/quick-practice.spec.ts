import { expect, test, type Page } from '@playwright/test';

async function draw(page: Page, ...values: number[]) {
  await page.evaluate(sequence => { Math.random = () => sequence.shift() ?? .99; }, values);
}

async function events(page: Page) {
  return page.evaluate(() => Object.entries(localStorage)
    .filter(([key]) => key.startsWith('lumar.progress:v1:event:'))
    .map(([, value]) => JSON.parse(value)));
}

const accept = (page: Page) => page.getByRole('button', { name: 'Aceptar práctica rápida' });
const timer = (page: Page) => page.getByRole('timer', { name: 'Tiempo restante' });
const timeBar = (page: Page) => page.locator('.quick-practice-clock progress');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => .99; });
  await page.clock.install({ time: new Date(2026, 10, 22, 8) });
  await page.setViewportSize({ width: 360, height: 800 });
});

async function offerClinicalChoice(page: Page) {
  await page.goto('/#cuerpo');
  await expect(accept(page)).toHaveCount(0);
  await draw(page, .1, .1, .99, 0);
  await page.getByRole('button', { name: 'Explorar 3D', exact: true }).click();
  await expect(page.getByText(/Selección múltiple · 15 s/)).toBeVisible();
}

test('el reloj empieza al aceptar y para al registrar el caso de selección múltiple', async ({ page }) => {
  await offerClinicalChoice(page);
  await page.clock.fastForward(20_000);
  await expect(timer(page)).toHaveCount(0);
  await accept(page).click();
  await expect(timer(page)).toContainText('15 s');
  await expect(page.getByText('Caso 1 de 1')).toBeVisible();
  await page.getByRole('button', { name: /Intramuscular adrenaline/ }).click();
  await page.getByRole('button', { name: 'Comprobar respuesta' }).click();
  await expect(page.getByText('Respuesta registrada')).toBeVisible();
  await expect(timeBar(page)).toHaveCount(0);
  await page.clock.fastForward(20_000);
  await expect(page.getByRole('heading', { name: 'Respuesta correcta' })).toBeVisible();
  expect(await events(page)).toMatchObject([{ kind: 'practice', correct: 1, quick: true }]);
  await page.getByRole('button', { name: 'Terminar práctica' }).click();
  await expect(page).toHaveURL(/#explorar$/);
});

test('la barra se vacía y al agotarse el tiempo se cierra la práctica sin guardar un resultado', async ({ page }) => {
  await offerClinicalChoice(page);
  await accept(page).click();
  await expect(timer(page)).toBeVisible();
  const bar = timeBar(page);
  await expect(bar).toHaveJSProperty('max', 15_000);
  const value = () => bar.evaluate((progress: HTMLProgressElement) => progress.value);
  expect(await value()).toBeGreaterThan(13_000);
  await page.clock.fastForward(6_500);
  await expect.poll(value).toBeLessThan(9_000);
  await expect(bar.locator('..')).toHaveAttribute('data-urgent', 'true');
  await page.clock.fastForward(10_000);
  await expect(page.getByRole('heading', { name: 'Se acabó el tiempo' })).toBeVisible();
  await expect(bar).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Comprobar respuesta' })).toHaveCount(0);
  expect(await events(page)).toEqual([]);
});

test('un reto rápido de anatomía muestra una pregunta y guarda la corrección', async ({ page }) => {
  await page.goto('/#cuerpo');
  await draw(page, .1, .9, .99, 0, 0);
  await page.getByRole('button', { name: 'Mi progreso', exact: true }).click();
  await expect(page.getByText(/Repaso breve · 20 s/)).toBeVisible();
  await accept(page).click();
  await expect(page.getByText('Pregunta 1 de 1')).toBeVisible();
  await page.getByRole('button', { name: 'Bíceps braquial' }).click();
  await page.getByRole('button', { name: 'Ver resultado' }).click();
  await expect(page.getByRole('heading', { name: 'Resultado del reto' })).toBeVisible();
  expect(await events(page)).toMatchObject([{ kind: 'practice', correct: 1, quick: true, context: { kind: 'reto' } }]);
  await page.getByRole('button', { name: 'Terminar práctica' }).click();
  await expect(page.getByText(/Repaso breve · Práctica rápida/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
});

test('una hipótesis correcta vale el punto completo sin reunir hallazgos', async ({ page }) => {
  await page.goto('/#cuerpo');
  await draw(page, .1, .1, .3, 0);
  await page.getByRole('button', { name: 'Practicar', exact: true }).click();
  await expect(page.getByText(/Investigación clínica · 60 s/)).toBeVisible();
  await accept(page).click();
  for (const question of [/Tienes alguna enfermedad conocida/, /Has tomado algún medicamento nuevo/, /Te has tomado la temperatura/]) {
    await page.getByRole('button', { name: question }).click();
  }
  await page.getByRole('button', { name: 'Elegir una hipótesis' }).click();
  await page.getByRole('button', { name: /Una posible enfermedad transmitida por alimentos/ }).click();
  await expect(page.getByText('0 de 2 hallazgos clave · 1 de 1 punto')).toBeVisible();
  await expect(page.getByText('Respuesta registrada')).toBeVisible();
  expect(await events(page)).toMatchObject([{ kind: 'practice', correct: 1, errors: 0, quick: true, context: { kind: 'caso' } }]);
});

test('una prueba en curso y un aviso reciente bloquean nuevas invitaciones', async ({ page }) => {
  await page.goto('/#practicar/casos');
  await page.getByRole('button', { name: 'Practicar solo Selección múltiple' }).click();
  await draw(page, .1, .1, .99, 0, .1, .1, .99, 0);
  await page.getByRole('button', { name: 'Mi progreso', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mi progreso' })).toBeVisible();
  await expect(accept(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Explorar 3D', exact: true }).click();
  await expect(accept(page)).toBeVisible();
  await page.getByRole('button', { name: 'Ahora no' }).click();
  await page.getByRole('button', { name: 'Cuerpo', exact: true }).click();
  await expect(accept(page)).toHaveCount(0);
});
