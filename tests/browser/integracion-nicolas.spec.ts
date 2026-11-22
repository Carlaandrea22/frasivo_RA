import { expect, test } from '@playwright/test';

test('el recordatorio de mediodía deja accesibles las acciones de Explorar', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.clock.setFixedTime(new Date(2026, 10, 22, 12));
  await page.addInitScript(() => { Math.random = () => .99; });
  await page.goto('/#explorar/estructura/lungs');
  await expect(page.getByRole('complementary', { name: 'Tu racha de hoy' })).toBeVisible();
  await page.getByRole('link', { name: 'Practicar esta estructura' }).click({ timeout: 5_000 });
  await expect(page.getByRole('link', { name: 'Elegir modelo para Señala la estructura' })).toBeVisible();
});
