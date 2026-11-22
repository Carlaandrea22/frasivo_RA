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
