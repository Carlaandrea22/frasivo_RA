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
  const mascota = page.locator('.mascota-panel svg.mascota');
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

test('el enlace de QA muestra las cinco etapas y permite bajar la racha de prueba', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(new Date(2026, 10, 22, 17));
  await page.goto('/?qa=racha#progreso');
  const mascota = page.locator('.mascota-panel svg.mascota');
  const subir = page.getByRole('button', { name: '+1 día', exact: true });
  const bajar = page.getByRole('button', { name: '−1 día', exact: true });
  await expect(mascota).toHaveAttribute('data-etapa', 'bebe');
  await expect(bajar).toBeDisabled();
  await expect(page.getByRole('complementary', { name: 'Tu racha de hoy' })).toHaveCount(0);

  let anterior = 0;
  for (const [dias, etapa] of [[1, 'nino'], [3, 'adolescente'], [7, 'medico_joven'], [14, 'medico_veterano']] as const) {
    for (let indice = anterior; indice < dias; indice += 1) await subir.click();
    await expect(mascota).toHaveAttribute('data-etapa', etapa);
    if (etapa === 'nino' || etapa === 'adolescente') {
      await page.getByRole('button', { name: 'Celebrar' }).click();
      const libro = mascota.locator('.mascota__libro');
      await expect(libro).toBeVisible();
      await expect(mascota.locator('.mascota__brazo--saludo')).toHaveCSS('transform', 'none');
      await expect(mascota.locator('.mascota__brazo--libro').last()).not.toHaveCSS('transform', 'none');
    }
    anterior = dias;
  }
  await bajar.click();
  await expect(mascota).toHaveAttribute('data-etapa', 'medico_joven');
  await page.getByRole('button', { name: 'Restaurar racha real' }).click();
  await expect(mascota).toHaveAttribute('data-etapa', 'bebe');
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('lumar.progress:v1:event:')))).toEqual([]);
});

test('el recordatorio móvil aparece a las 12 y a las 20 sin repetirse al recargar', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.clock.install({ time: new Date(2026, 10, 22, 11, 59, 45) });
  await page.goto('/#progreso');
  const recordatorio = page.getByRole('complementary', { name: 'Tu racha de hoy' });
  await expect(recordatorio).toHaveCount(0);
  await page.clock.fastForward(20_000);
  await expect(recordatorio.getByText(/hermano mayor/)).toBeVisible();
  const caja = await recordatorio.boundingBox();
  expect(caja?.width).toBeGreaterThan(340);
  const enlace = recordatorio.getByRole('link', { name: 'Practicar ahora' });
  expect((await enlace.boundingBox())?.height).toBeGreaterThanOrEqual(48);
  await recordatorio.getByRole('button', { name: 'Cerrar recordatorio' }).click();
  await page.reload();
  await expect(recordatorio).toHaveCount(0);

  await page.clock.setSystemTime(new Date(2026, 10, 22, 19, 59, 45));
  await page.reload();
  await page.clock.fastForward(20_000);
  await expect(recordatorio.getByText(/Antes de dormir/)).toBeVisible();
  await enlace.click();
  await expect(page).toHaveURL(/#practicar\/casos$/);
  await expect(recordatorio).toHaveCount(0);
});

test('usa el mensaje de la etapa real y deja de avisar al completar la meta', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 22, 12));
  await page.addInitScript(() => {
    for (const [dia, cantidad] of [[21, 5], [22, 4]]) {
      for (let index = 0; index < cantidad; index += 1) {
        const id = `recordatorio-${dia}-${index}`;
        if (localStorage.getItem(`lumar.progress:v1:event:${id}`)) continue;
        localStorage.setItem(`lumar.progress:v1:event:${id}`, JSON.stringify({
          id, kind: 'practice', areaId: 'anatomy', groupId: 'clinical-cases', itemId: 'anaphylaxis-choice',
          timestamp: new Date(2026, 10, dia, 9).toISOString(), correct: 0, errors: 1, hints: 0,
        }));
      }
    }
  });
  await page.goto('/#progreso');
  const recordatorio = page.getByRole('complementary', { name: 'Tu racha de hoy' });
  await expect(recordatorio.getByText(/Te reto/)).toBeVisible();
  await expect(recordatorio.getByText('Te falta 1 caso para completar la meta.')).toBeVisible();
  await completarCaso(page);
  await page.clock.setFixedTime(new Date(2026, 10, 22, 20));
  await page.goto('/#progreso');
  await page.reload();
  await expect(page.getByText('Meta de hoy completada')).toBeVisible();
  await expect(recordatorio).toHaveCount(0);
});
