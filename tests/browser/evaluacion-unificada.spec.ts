import { expect, test, type Page } from '@playwright/test';

const clinicalHome = '/#practicar/casos';
const openMultipleChoice = (page: Page) => page.getByRole('button', { name: 'Practicar solo Selección múltiple' }).click();
const start = (page: Page) => page.getByRole('button', { name: 'Empezar práctica', exact: true }).click();

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => { Math.random = () => .99; });
});

test('configura cantidad, tema y modo y permite hacer los casos disponibles del tema', async ({ page }) => {
  await page.goto(clinicalHome);
  await expect(page.getByRole('button', { name: 'Evaluación', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Practicar solo Investigación clínica' }).click();
  const count = page.getByRole('combobox', { name: 'Cantidad de casos' });
  const theme = page.getByRole('combobox', { name: 'Tema', exact: true });
  await expect(count.locator('option[value="5"]')).toHaveCount(0);
  await expect(count.locator('option[value="10"]')).toHaveCount(0);
  await count.selectOption('3');
  await theme.selectOption('huesos');
  await expect(page.getByRole('status').filter({ hasText: /Hay 2 casos disponibles/ })).toBeVisible();
  await page.getByRole('button', { name: 'Evaluación', exact: true }).click();
  await page.getByRole('button', { name: 'Hacer los 2 casos disponibles' }).click();
  await expect(page.getByText('Caso 1 de 2')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Investigación · Dolor de cabeza' })).toBeVisible();
  await expect(page.getByText('Evaluación · Investigación clínica')).toBeVisible();
  await page.getByRole('button', { name: 'Salir', exact: true }).click();
  await openMultipleChoice(page);
  await expect(page.getByRole('button', { name: 'Entrenamiento', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await theme.selectOption('huesos');
  await expect(page.getByRole('status').filter({ hasText: /No hay casos/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Empezar práctica' })).toBeDisabled();
  await theme.selectOption('aleatorio');
  await count.selectOption('3');
  await start(page);
  await expect(page.getByText('Caso 1 de 3')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Descartar una opción' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});

test('Mi progreso abre un resultado clínico nuevo y otro guardado con el formato anterior', async ({ page }) => {
  await page.addInitScript(() => {
    const id = 'caso-historico';
    localStorage.setItem(`lumar.progress:v1:event:${id}`, JSON.stringify({
      id, kind: 'practice', areaId: 'anatomy', groupId: 'clinical-cases', itemId: 'knee-conversation',
      correct: 2, errors: 1, hints: 0, timestamp: new Date(2026, 10, 20, 8).toISOString(),
    }));
  });
  await page.goto(clinicalHome);
  await openMultipleChoice(page);
  await page.getByRole('button', { name: 'Evaluación', exact: true }).click();
  await start(page);
  await expect(page.getByRole('button', { name: 'Descartar una opción' })).toHaveCount(0);
  await page.getByRole('button', { name: /^Adrenalina intramuscular/ }).click();
  await page.getByRole('button', { name: 'Comprobar respuesta' }).click();
  await page.getByRole('button', { name: 'Ver resultados' }).click();
  await expect(page.locator('.evaluation-summary-mascot')).toHaveAttribute('data-animacion', 'celebracion');
  await expect(page.locator('.evaluation-confetti')).toBeVisible();
  await page.getByRole('button', { name: 'Repetir', exact: true }).click();
  await expect(page.getByText('Caso 1 de 1')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Descartar una opción' })).toHaveCount(0);
  await page.goto('/#progreso/practicas');
  await page.getByRole('article').filter({ hasText: 'Reacción alérgica' }).getByRole('link', { name: 'Ver resultado del caso' }).click();
  await expect(page.getByRole('heading', { name: 'Resultado del caso' })).toBeVisible();
  await expect(page.getByText('100%', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('100%', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Ver mis prácticas' }).click();
  await page.getByRole('article').filter({ hasText: 'Dolor de rodilla' }).getByRole('link', { name: 'Ver resultado del caso' }).click();
  await expect(page.getByText('67%', { exact: true })).toBeVisible();
  await expect(page.locator('.evaluation-summary-mascot')).toHaveAttribute('data-animacion', 'reposo');
});

async function finishChallenge(page: Page, correct: number) {
  await page.goto('/#practicar/retos/repaso-musculos');
  await page.getByRole('button', { name: 'Evaluación', exact: true }).click();
  await page.getByRole('button', { name: 'Empezar reto' }).click();
  const answers = page.getByRole('group', { name: 'Respuestas' });
  await answers.getByRole('button', { name: correct > 0 ? 'Bíceps braquial' : 'Cuádriceps femoral', exact: true }).click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  if (correct === 2) await answers.getByRole('button', { name: 'Recto femoral', exact: true }).click();
  else await answers.getByRole('button', { name: 'Vasto medial', exact: true }).click();
  await page.getByRole('button', { name: 'Ver resultado', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Resultado del reto' })).toBeVisible();
}

for (const [correct, reaction] of [[2, 'celebracion'], [1, 'reposo'], [0, 'triste']] as const) {
  test(`el resultado del reto reacciona a ${correct} aciertos con ${reaction}`, async ({ page }) => {
    await finishChallenge(page, correct);
    await expect(page.locator('.evaluation-summary-mascot')).toHaveAttribute('data-animacion', reaction);
    const confetti = page.locator('.evaluation-confetti');
    if (correct === 2) await expect(confetti).toBeVisible();
    else await expect(confetti).toHaveCount(0);
  });
}

test('el resultado alto respeta la preferencia de movimiento reducido', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await finishChallenge(page, 2);
  const mascot = page.locator('.evaluation-summary-mascot');
  await expect(mascot).toHaveAttribute('data-animacion', 'celebracion');
  await expect(mascot.locator('.mascota__cuerpo')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.evaluation-confetti')).toBeHidden();
});
