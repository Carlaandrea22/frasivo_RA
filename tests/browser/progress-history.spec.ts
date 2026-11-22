import { expect, test } from '@playwright/test';

test('pagina el historial mixto y permite encontrar un reto por nombre sin tildes', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.addInitScript(() => {
    for (let index = 0; index < 14; index += 1) {
      const challenge = index < 2;
      const id = `practice-${index}`;
      localStorage.setItem(`lumar.progress:v1:event:${id}`, JSON.stringify({
        id, kind: 'practice', areaId: 'anatomy',
        groupId: challenge ? 'organos' : 'clinical-cases',
        itemId: challenge ? 'heart' : 'knee-conversation',
        activityId: challenge ? 'corazon-3d' : 'knee-conversation',
        timestamp: new Date(2026, index < 4 ? 9 : 10, index + 1, 12).toISOString(),
        correct: 1, errors: 1, hints: 0,
        context: challenge ? { kind: 'reto', mode: 'evaluacion' } : undefined,
      }));
    }
  });
  await page.goto('/#progreso/practicas');
  await expect(page.getByRole('article')).toHaveCount(10);
  await expect(page.getByText('Página 1 de 2')).toBeVisible();
  await page.getByRole('button', { name: 'Página siguiente' }).click();
  await expect(page.getByRole('article')).toHaveCount(4);
  await expect(page.getByRole('heading', { name: 'octubre de 2026' })).toBeVisible();
  await page.getByRole('button', { name: 'Retos de anatomía' }).click();
  await expect(page.getByRole('article')).toHaveCount(2);
  await page.getByRole('searchbox', { name: 'Buscar práctica' }).fill('corazon');
  await expect(page.getByRole('article')).toHaveCount(2);
  await page.getByRole('searchbox', { name: 'Buscar práctica' }).fill('rodilla');
  await expect(page.getByText('No hay prácticas que coincidan')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
});

test('filtra la actividad, las sugerencias y el historial por el mismo formato', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.addInitScript(() => {
    Math.random = () => .99;
    const common = { kind: 'practice', areaId: 'anatomy', hints: 0, correct: 1, errors: 2 };
    const entries = [
      { groupId: 'clinical-cases', itemId: 'knee-conversation' },
      { groupId: 'clinical-cases', itemId: 'matching-daily', mode: 'evaluacion' },
      { groupId: 'organos', itemId: 'heart', activityId: 'corazon-3d', quick: true, context: { kind: 'reto', mode: 'evaluacion' } },
    ];
    entries.forEach((entry, i) => {
      const id = `format-${i}`;
      localStorage.setItem(`lumar.progress:v1:event:${id}`, JSON.stringify({
        ...common, ...entry, id, timestamp: new Date(2026, 10, i + 1, 12).toISOString(),
      }));
    });
  });
  await page.goto('/#progreso');
  const format = page.getByRole('combobox', { name: 'Modalidad de práctica' });
  await expect(format.getByRole('option', { name: 'Todos (3)' })).toHaveCount(1);
  await expect(format.getByRole('option', { name: 'Solo rápidas (1)' })).toHaveCount(1);
  await format.selectOption('evaluacion');
  await expect(page.getByRole('list', { name: 'Distribución de prácticas' })).toContainText('Relaciona síntomas y causas');
  await expect(page.getByRole('heading', { name: 'Relaciona síntomas y causas' })).toBeVisible();

  await page.getByRole('link', { name: 'Mis prácticas' }).click();
  await expect(format).toHaveValue('evaluacion');
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article')).toContainText('Evaluación');
  await format.selectOption('rapida');
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article')).toContainText('Práctica rápida');
  await page.getByRole('link', { name: 'Mi progreso' }).click();
  await expect(format).toHaveValue('rapida');
  await expect(page.getByRole('list', { name: 'Distribución de prácticas' })).toContainText('Señala la estructura');
  await format.selectOption('entrenamiento');
  await expect(page.getByRole('heading', { name: 'Conversación y comprensión' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
  await format.selectOption('all');
  await expect(page.getByRole('list', { name: 'Distribución de prácticas' }).getByRole('listitem')).toHaveCount(3);

  await format.selectOption('evaluacion');
  await page.getByRole('link', { name: 'Hacer una evaluación' }).click();
  await expect(page.getByText('Evaluación · Relaciona síntomas y causas')).toBeVisible();
  const cases = page.locator('[data-match-source]');
  const causes = page.locator('[data-match-cause]');
  for (let index = 0; index < 3; index += 1) {
    await cases.nth(index).click();
    await causes.nth(index).click();
  }
  await page.getByRole('button', { name: 'Comprobar conexiones' }).click();
  await page.getByRole('button', { name: 'Ver resultados' }).click();
  await page.goto('/#progreso/practicas/evaluacion');
  await expect(page.getByRole('article')).toHaveCount(2);
});
