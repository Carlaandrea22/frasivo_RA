import { expect, test, type Page } from './returningProfile';

const nav = (page: Page) => page.getByRole('navigation', { name: 'Navegación móvil', exact: true });
async function openObjects(page: Page) {
  await page.goto('/');
  await nav(page).getByRole('button', { name: 'Explora objetos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'El software toma forma.' })).toBeVisible();
}
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });

test('diez escenas reales, ficha, controles, audio por gesto y navegación móvil', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    (window as any).spoken = [];
    window.speechSynthesis.speak = u => { (window as any).spoken.push({ text: u.text, lang: u.lang, gesture: navigator.userActivation.isActive }); };
  });
  await openObjects(page);
  const list = page.getByRole('group', { name: 'Vocabulario de software' });
  await expect(list.getByRole('button')).toHaveCount(10);
  await expect(nav(page).getByRole('button')).toHaveCount(5);
  for (const term of ['Array', 'Stack', 'Queue', 'Thread', 'Repository', 'Deployment', 'Framework', 'Middleware', 'Inheritance', 'Dependency']) {
    await list.getByRole('button', { name: new RegExp(`^${term} `) }).click();
    await expect(page.getByRole('heading', { name: term, exact: true })).toBeVisible();
    await expect(page.locator('.object-canvas canvas')).toBeVisible();
    await expect(page.locator('.object-canvas')).toHaveAttribute('data-rendered', term.toLowerCase());
  }
  await page.getByRole('button', { name: 'Girar a la derecha' }).click();
  await page.getByRole('slider', { name: 'Tamaño del objeto' }).fill('1.3');
  await page.getByRole('button', { name: 'Restablecer vista' }).click();
  await expect(page.getByRole('slider', { name: 'Tamaño del objeto' })).toHaveValue('1');
  await page.getByRole('button', { name: 'Escuchar Dependency', exact: true }).click();
  expect(await page.evaluate(() => (window as any).spoken)).toEqual([{ text: 'Dependency', lang: 'en-US', gesture: true }]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/objects-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('.breadcrumb')).toContainText('Explora objetos');
  await page.screenshot({ path: 'test-results/objects-desktop.png', fullPage: true });
  await page.getByRole('navigation', { name: 'Navegación principal', exact: true }).getByRole('button', { name: 'Misiones', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Un reto de inglés en tu aula.' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('cámara se comparte entre palabras y se libera al salir', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).cameraStarts = 0;
    navigator.mediaDevices.getUserMedia = async () => {
      (window as any).cameraStarts++;
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
      const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#b5c9b5'; ctx.fillRect(0, 0, 640, 480);
      const stream = canvas.captureStream(1); (window as any).objectStream = stream; return stream;
    };
  });
  await openObjects(page);
  await page.getByRole('button', { name: 'Activar cámara', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Detener cámara', exact: true })).toBeVisible();
  await page.getByRole('group', { name: 'Vocabulario de software' }).getByRole('button', { name: /^Stack / }).click();
  expect(await page.evaluate(() => (window as any).cameraStarts)).toBe(1);
  await page.screenshot({ path: 'test-results/objects-camera-mobile.png', fullPage: true });
  await nav(page).getByRole('button', { name: 'Explorar', exact: true }).click();
  expect(await page.evaluate(() => (window as any).objectStream.getTracks().every((t: MediaStreamTrack) => t.readyState === 'ended'))).toBe(true);
});

test('denegación de cámara conserva el vocabulario y el visor 3D', async ({ page }) => {
  await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('blocked', 'NotAllowedError'); }; });
  await openObjects(page);
  await page.getByRole('button', { name: 'Activar cámara', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('permiso');
  await expect(page.getByRole('heading', { name: 'Array', exact: true })).toBeVisible();
  await expect(page.locator('.object-canvas canvas')).toBeVisible();
});

test('salir con permiso pendiente detiene la cámara que llega tarde', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => new Promise(resolve => { (window as any).grantObjectCamera = () => {
      const canvas = document.createElement('canvas'); const stream = canvas.captureStream(1); (window as any).lateObjectStream = stream; resolve(stream);
    }; });
  });
  await openObjects(page);
  await page.getByRole('button', { name: 'Activar cámara', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cancelar cámara', exact: true })).toBeVisible();
  await nav(page).getByRole('button', { name: 'Explorar', exact: true }).click();
  await page.evaluate(() => (window as any).grantObjectCamera());
  await expect.poll(() => page.evaluate(() => (window as any).lateObjectStream.getTracks().every((t: MediaStreamTrack) => t.readyState === 'ended'))).toBe(true);
});

test('sin WebGL ofrece la ficha con aviso en lugar de fingir un modelo', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: any[]) {
      if (type.startsWith('webgl')) return null;
      return (original as any).call(this, type, ...args);
    } as typeof original;
  });
  await openObjects(page);
  await expect(page.getByRole('status').filter({ hasText: '3D no está disponible' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Array', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Escuchar Array', exact: true })).toBeEnabled();
});

test('enviar la app al fondo detiene la cámara y permite reactivarla', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 240;
      const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#b5c9b5'; ctx.fillRect(0, 0, 320, 240);
      const stream = canvas.captureStream(1); (window as any).backgroundStream = stream; return stream;
    };
  });
  await openObjects(page);
  await page.getByRole('button', { name: 'Activar cámara', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Detener cámara', exact: true })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(await page.evaluate(() => (window as any).backgroundStream.getTracks().every((t: MediaStreamTrack) => t.readyState === 'ended'))).toBe(true);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.getByRole('button', { name: 'Activar cámara', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Detener cámara', exact: true })).toBeVisible();
});

test('la colección y sus escenas se pueden abrir sin conexión tras instalar la PWA', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
  });
  await context.setOffline(true);
  await page.reload();
  await nav(page).getByRole('button', { name: 'Explora objetos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Array', exact: true })).toBeVisible();
  await expect(page.locator('.object-canvas')).toHaveAttribute('data-rendered', 'array');
  await page.getByRole('group', { name: 'Vocabulario de software' }).getByRole('button', { name: /^Framework / }).click();
  await expect(page.locator('.object-canvas')).toHaveAttribute('data-rendered', 'framework');
  await context.setOffline(false);
});
