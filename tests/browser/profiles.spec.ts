import { expect, guestTest as test, type Page } from './returningProfile';

async function enter(page: Page, career = 'Medicina', level = 'Básico') {
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await page.getByLabel('Correo electrónico').fill('carla@example.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('Frasivo test password 2026');
  await page.getByLabel('Tu nombre').fill('Carla');
  await page.getByRole('radio', { name: new RegExp(`^${career}`) }).check();
  await page.getByRole('radio', { name: new RegExp(`^${level}`) }).check();
  await page.getByRole('button', { name: 'Crear mi cuenta', exact: true }).click();
}
const nav = (page: Page) => page.getByRole('navigation', { name: 'Navegación móvil', exact: true });
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });

test('inicio real con tres carreras, perfil persistente, objetos y práctica de medicina', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible();
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(page.getByRole('group', { name: '¿Cuál es tu carrera?' }).getByRole('radio')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Crear mi cuenta', exact: true })).toBeDisabled();
  await page.screenshot({ path: 'test-results/profile-onboarding.png', fullPage: true });
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await enter(page);
  await expect(page.getByText('Hola, Carla.', { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByText('Hola, Carla.', { exact: true })).toBeVisible();
  await nav(page).getByRole('button', { name: 'Explora objetos', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Vocabulario de Medicina' }).getByRole('button')).toHaveCount(10);
  await expect(page.getByRole('heading', { name: 'Heart', exact: true })).toBeVisible();
  await expect(page.getByText('Modelo 3D pendiente', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Escuchar Heart', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Activar cámara', exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/profile-medicine.png', fullPage: true });
  await nav(page).getByRole('button', { name: 'Practicar', exact: true }).click();
  await expect(page.locator('.career-practice-context')).toContainText('Básico');
  await page.locator('.answer-option').filter({ hasText: 'Corazón' }).click();
  await expect(page.locator('.feedback')).toContainText('+10 puntos');
  await page.reload(); await expect(page.locator('.points')).toContainText('10 puntos');
});

test('editar carrera y nivel cambia colección y preguntas sin mezclar puntos', async ({ page }) => {
  await page.goto('/'); await enter(page);
  await nav(page).getByRole('button', { name: 'Practicar', exact: true }).click();
  await page.locator('.answer-option').filter({ hasText: 'Corazón' }).click();
  await expect(page.locator('.points')).toContainText('10 puntos');
  await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
  await page.getByRole('radio', { name: /^Gastronomía/ }).check();
  await page.getByRole('radio', { name: /^Avanzado/ }).check();
  await page.getByRole('button', { name: 'Guardar perfil', exact: true }).click();
  await expect(page.locator('.points')).toContainText('0 puntos');
  await nav(page).getByRole('button', { name: 'Explora objetos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Knife', exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Vocabulario de Gastronomía' })).not.toContainText('Heart');
  await nav(page).getByRole('button', { name: 'Practicar', exact: true }).click();
  await expect(page.locator('.career-practice-context')).toContainText('Avanzado');
  await expect(page.getByLabel('Palabra en inglés')).toBeVisible();
  await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
  await page.getByRole('radio', { name: /^Ingeniería de Sistemas/ }).check();
  await page.getByRole('radio', { name: /^Intermedio/ }).check();
  await page.getByRole('button', { name: 'Guardar perfil', exact: true }).click();
  await nav(page).getByRole('button', { name: 'Practicar', exact: true }).click();
  await expect(page.locator('.career-practice-context')).toContainText('Intermedio');
  await expect(page.locator('.practice-card h2')).toContainText('____');
  await expect(page.locator('.answer-option')).toHaveCount(4);
  await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible();
  await page.reload(); await expect(page.getByLabel('Correo electrónico')).toBeVisible();
  await page.getByLabel('Correo electrónico').fill('carla@example.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('Frasivo test password 2026');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.locator('.points')).toContainText('0 puntos');
  await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
  await page.getByRole('radio', { name: /^Medicina/ }).check();
  await page.getByRole('button', { name: 'Guardar perfil', exact: true }).click();
  await expect(page.locator('.points')).toContainText('10 puntos');
});

test('la cuenta funciona sin localStorage y conserva su progreso por carrera', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw Error('blocked'); }; });
  await page.goto('/'); await enter(page);
  await expect(page.getByText(/El perfil no pudo guardarse/)).toHaveCount(0);
  await expect(page.getByText('Hola, Carla.', { exact: true })).toBeVisible();
  await nav(page).getByRole('button', { name: 'Practicar', exact: true }).click();
  await page.locator('.answer-option').filter({ hasText: 'Corazón' }).click();
  await expect(page.locator('.points')).toContainText('10 puntos');
  await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
  await page.getByRole('radio', { name: /^Gastronomía/ }).check();
  await page.getByRole('button', { name: 'Guardar perfil', exact: true }).click();
  await expect(page.locator('.points')).toContainText('0 puntos');
  await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
  await page.getByRole('radio', { name: /^Medicina/ }).check();
  await page.getByRole('button', { name: 'Guardar perfil', exact: true }).click();
  await expect(page.locator('.points')).toContainText('10 puntos');
});

test('abrir el perfil y volver sin cambios conserva la práctica y lo escrito', async ({ page }) => {
  await page.goto('/'); await enter(page, 'Ingeniería de Sistemas', 'Avanzado');
  await nav(page).getByRole('button', { name: 'Practicar', exact: true }).click();
  await page.getByLabel('Palabra en inglés').fill('Array');
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await page.getByLabel('Palabra en inglés').fill('sta');
  await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
  await page.getByRole('button', { name: 'Volver sin cambios', exact: true }).click();
  await expect(page.getByLabel('Palabra en inglés')).toHaveValue('sta');
  await expect(page.locator('.practice-top')).toContainText('2 de 10');
  await expect(page.locator('.points')).toContainText('10 puntos');
});

test('editar el perfil cancela la cámara pendiente de la carrera anterior', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => new Promise(resolve => { (window as any).grantProfileCamera = () => {
      const canvas = document.createElement('canvas'); const stream = canvas.captureStream(1); (window as any).profileStream = stream; resolve(stream);
    }; });
  });
  await page.goto('/'); await enter(page, 'Ingeniería de Sistemas');
  await nav(page).getByRole('button', { name: 'Explora objetos', exact: true }).click();
  await page.getByRole('button', { name: 'Activar cámara', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cancelar cámara', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
  await page.evaluate(() => (window as any).grantProfileCamera());
  await expect.poll(() => page.evaluate(() => (window as any).profileStream.getTracks().every((t: MediaStreamTrack) => t.readyState === 'ended'))).toBe(true);
  await page.getByRole('radio', { name: /^Medicina/ }).check();
  await page.getByRole('button', { name: 'Guardar perfil', exact: true }).click();
  await nav(page).getByRole('button', { name: 'Explora objetos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Heart', exact: true })).toBeVisible();
});
