import { expect, test } from '@playwright/test';

test('la mascota cruza un umbral con un acierto y conserva la etapa al volver a Mi progreso', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    const seedKey = 'lumar.progress:v1:event:mascota-fixture';
    if (localStorage.getItem(seedKey)) return;
    localStorage.setItem('frasivo-explore:v1', JSON.stringify({
      version: 1,
      points: 80,
      words: { femur: { attempts: 4, correct: 2 } },
    }));
    localStorage.setItem(seedKey, JSON.stringify({
      id: 'mascota-fixture', timestamp: '2026-01-01T00:00:00.000Z', kind: 'practice',
      areaId: 'anatomy', itemId: 'primary-assessment-order', correct: 7, assisted: 2, errors: 3, hints: 2,
    }));
  });

  await page.goto('/#progreso');
  const mascota = page.locator('svg.mascota');
  await expect(mascota).toHaveAttribute('data-etapa', 'bebe');
  await expect(page.getByText('Falta 1 acierto para Niño.')).toBeVisible();

  await page.goto('/#practicar/casos');
  await page.getByRole('button', { name: 'Practicar solo Selección múltiple' }).click();
  await page.getByRole('button', { name: 'Intramuscular adrenaline' }).click();
  await page.getByRole('button', { name: 'Comprobar respuesta' }).click();
  await page.getByRole('button', { name: 'Siguiente caso' }).click();
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('button', { name: 'Mi progreso' }).click();

  await expect(mascota).toHaveAttribute('data-etapa', 'nino');
  await expect(mascota).toHaveAttribute('data-animacion', 'celebracion');
  await expect(page.getByText('Faltan 15 aciertos para Adolescente.')).toBeVisible();
  await page.getByRole('button', { name: 'Saludar' }).click();
  await expect(mascota).toHaveAttribute('data-animacion', 'saludo');
  await page.getByRole('button', { name: 'Celebrar' }).click();
  await expect(mascota).toHaveAttribute('data-animacion', 'celebracion');

  await page.reload();
  await expect(mascota).toHaveAttribute('data-etapa', 'nino');
  await expect(mascota).toHaveAttribute('data-animacion', 'reposo');
});
