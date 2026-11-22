import { expect, test, type Page } from '@playwright/test';

async function completarCaso(page: Page) {
  await page.goto('/#practicar/casos');
  await page.getByRole('button', { name: 'Practicar solo Selección múltiple' }).click();
  await page.getByRole('button', { name: 'An oral antibiotic' }).click();
  await page.getByRole('button', { name: 'Comprobar respuesta' }).click();
  await page.getByRole('button', { name: 'Siguiente caso' }).click();
  await page.getByRole('button', { name: 'Volver a Casos clínicos' }).click();
}

test('cinco casos sueltos cuentan como un día de racha aunque las respuestas sean incorrectas', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.clock.install({ time: new Date(2026, 10, 22, 12) });
  for (let index = 0; index < 4; index += 1) await completarCaso(page);

  await page.goto('/#progreso');
  const mascota = page.locator('svg.mascota');
  await expect(mascota).toHaveAttribute('data-etapa', 'bebe');
  await expect(page.getByText('Meta de hoy · 4 de 5 casos')).toBeVisible();

  await completarCaso(page);
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('button', { name: 'Mi progreso' }).click();
  await expect(mascota).toHaveAttribute('data-etapa', 'nino');
  await expect(mascota).toHaveAttribute('data-animacion', 'celebracion');
  await expect(page.getByText('1 día de racha')).toBeVisible();
  await expect(page.getByText('Meta de hoy completada')).toBeVisible();
  await page.getByRole('button', { name: 'Saludar' }).click();
  await expect(mascota).toHaveAttribute('data-animacion', 'saludo');

  await completarCaso(page);
  await page.goto('/#progreso');
  await page.reload();
  await expect(page.getByText('1 día de racha')).toBeVisible();
  await expect(mascota).toHaveAttribute('data-animacion', 'reposo');

  await page.clock.setSystemTime(new Date(2026, 10, 23, 23, 59, 45));
  await page.reload();
  await expect(page.getByText('1 día de racha')).toBeVisible();
  await expect(page.getByText('Meta de hoy · 0 de 5 casos')).toBeVisible();

  await page.clock.fastForward(20_000);
  await expect(page.getByText('0 días de racha')).toBeVisible();
  await expect(mascota).toHaveAttribute('data-etapa', 'bebe');
});
