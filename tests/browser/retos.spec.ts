import { expect, test } from '@playwright/test';

test('Entrenamiento permite usar una pista, corregir la respuesta y repasar el error guardado', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/#practicar/retos/repaso-musculos');
  await expect(page.getByRole('button', { name: 'Empezar reto' })).toBeVisible({ timeout: 2000 });
  await page.getByRole('button', { name: 'Empezar reto' }).click();
  await page.getByRole('button', { name: /Pista/ }).click();
  await expect(page.getByText('Piensa en el músculo de la cara anterior del brazo.')).toBeVisible();
  await page.getByRole('button', { name: /Cuádriceps femoral/ }).click();
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await expect(page.getByText('Vuelve a intentarlo', { exact: true })).toBeVisible();
  const [ficha] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('link', { name: 'Ver en Explorar 3D' }).click(),
  ]);
  await expect(ficha.getByRole('heading', { name: 'Bíceps braquial', level: 1 })).toBeVisible();
  await ficha.close();
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await page.getByRole('button', { name: /Bíceps braquial/ }).click();
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: /Recto femoral/ }).click();
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await page.getByRole('button', { name: 'Ver resultado' }).click();
  await expect(page.getByText('2 de 2', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Repasar errores' }).click();
  await expect(page.getByRole('link', { name: 'Ver en Explorar 3D' })).toHaveAttribute('href', '#explorar/estructura/biceps_brachii');
});

test('coloca etiquetas por arrastre y por toques en el modelo', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/#practicar/retos/partes-femur');
  await page.getByRole('button', { name: 'Empezar reto' }).click();
  await expect(page.locator('.retos-drop--overlay')).toHaveCount(3);
  const ficha = (name: string) => page.getByRole('group', { name: 'Etiquetas de partes' }).getByRole('button', { name });
  const recuadro = (number: number) => page.getByRole('button', { name: new RegExp(`^Recuadro ${number},`) });
  await ficha('Cabeza del fémur').dragTo(recuadro(1));
  await expect(recuadro(1)).toHaveText(/Cabeza del fémur/);
  await ficha('Cuerpo del fémur').click();
  await recuadro(2).click();
  await recuadro(2).click();
  await expect(recuadro(2)).toHaveAccessibleName('Recuadro 2, vacío');
  await ficha('Cuerpo del fémur').click();
  await recuadro(2).click();
  await ficha('Cóndilos femorales').click();
  await recuadro(3).click();
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await expect(page.getByText('¡Correcto!')).toBeVisible();
  await page.getByRole('button', { name: 'Ver resultado' }).click();
  await expect(page.getByText('3 de 3', { exact: true })).toBeVisible();
});

test('desde la ficha del fémur se elige un reto y se forman tres parejas', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/#explorar/estructura/femur');
  await page.getByRole('link', { name: 'Practicar esta estructura' }).click();
  await expect(page.getByRole('link', { name: /^Abrir reto:/ })).toHaveCount(2);
  await page.getByRole('link', { name: 'Abrir reto: El fémur en movimiento' }).click();
  await page.getByRole('button', { name: 'Empezar reto' }).click();
  await page.getByRole('button', { name: 'Salir', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '¿Salir del reto?' })).toBeVisible();
  await page.keyboard.press('Escape');
  const estructuras = page.getByRole('group', { name: 'Estructuras' });
  const funciones = page.getByRole('group', { name: 'Funciones' });
  for (const [nombre, funcion] of [['Fémur', /Transmitir el peso/], ['Tibia', /Soportar gran parte/], ['Rótula', /Mejorar la palanca/]] as const) {
    await estructuras.getByRole('button', { name: nombre, exact: true }).click();
    await funciones.getByRole('button', { name: funcion }).click();
  }
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await page.getByRole('button', { name: 'Ver resultado' }).click();
  await expect(page.getByText('3 de 3', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});

test('Evaluación del corazón selecciona en 3D y guarda la corrección al terminar', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/#practicar/retos/corazon-3d');
  await page.getByRole('button', { name: 'Evaluación', exact: true }).click();
  await page.getByRole('button', { name: 'Empezar reto' }).click();
  await expect(page.getByRole('button', { name: /^Pista/ })).toHaveCount(0);
  await expect(page.locator('[data-viewer-state="ready"]')).toBeVisible();
  const canvas = page.locator('canvas');
  const size = await canvas.boundingBox();
  await canvas.click({ position: { x: size!.width * .58, y: size!.height * .40 } });
  await expect(page.getByText('Pieza seleccionada')).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.locator('.retos-feedback')).toHaveCount(0);
  await page.getByRole('button', { name: 'Mostrar números para seleccionar' }).click();
  const pieza = page.getByRole('button', { name: 'Pieza 1', exact: true });
  await pieza.focus();
  await page.keyboard.press('Enter');
  await expect(pieza).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await page.getByRole('button', { name: 'Mostrar números para seleccionar' }).click();
  await canvas.click({ position: { x: size!.width * .37, y: size!.height * .58 } });
  await page.getByRole('button', { name: 'Ver resultado' }).click();
  await expect(page.getByRole('heading', { name: 'Resultado del reto' })).toBeVisible();
  await expect(page.getByText('Respuesta correcta:', { exact: false }).filter({ hasText: 'Válvula mitral' })).toBeVisible();
  const data = await page.evaluate(() => Object.entries(localStorage)
    .filter(([key]) => key.startsWith('lumar.progress:v1:event:')).map(([, value]) => JSON.parse(value)));
  expect(data.filter(event => event.kind === 'practice' && event.activityId === 'corazon-3d')).toHaveLength(1);
  expect(data.filter(event => event.kind === 'demonstration' && event.activityId === 'corazon-3d')).toHaveLength(1);
  await page.getByRole('link', { name: 'Otro reto' }).click();
  await expect(page.getByRole('link', { name: /Último resultado:/ })).toHaveCount(1);
  await page.getByRole('button', { name: 'Mi progreso' }).click();
  await expect(page.getByText('Prácticas realizadas · 1')).toBeVisible();
});
