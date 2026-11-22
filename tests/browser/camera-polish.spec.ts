import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('muestra la guía de primera vez y retira la silueta al detectar un cuerpo', async ({ page }, testInfo) => {
  const source = 'data:image/jpeg;base64,' + (await readFile('tests/fixtures/pose-front.jpg')).toString('base64');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(source => {
    const scene = { person: 'none', requests: 0 };
    Object.assign(window, { guideTestScene: scene });
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: async () => {
        scene.requests++;
        const image = new Image();
        image.src = source;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = 560;
        canvas.height = 1040;
        const ctx = canvas.getContext('2d')!;
        const draw = () => {
          if (scene.person !== 'none') {
            const height = scene.person === 'partial' ? 750 : 925;
            const zoom = 1040/height;
            ctx.drawImage(image, 140, 65, 550, height, (560-550*zoom)/2, 0, 550*zoom, 1040);
          } else {
            const background = ctx.createLinearGradient(0, 0, 560, 1040);
            background.addColorStop(0, '#273e37');
            background.addColorStop(1, '#566b61');
            ctx.fillStyle = background;
            ctx.fillRect(0, 0, 560, 1040);
          }
        };
        draw();
        const timer = setInterval(draw, 54);
        const stream = canvas.captureStream(18);
        const track = stream.getVideoTracks()[0];
        const stop = track.stop.bind(track);
        track.stop = () => { clearInterval(timer); stop(); };
        return stream;
      },
    });
  }, source);

  await page.goto('/#cuerpo');
  const button = page.getByRole('button', { name: 'Activar cámara' });
  const sheet = page.getByRole('dialog', { name: 'Guía de cámara' });
  await button.click();
  await expect(sheet.getByRole('listitem')).toHaveCount(3);
  await expect(sheet.getByText('La cámara se procesa en tu teléfono. No se guarda ni se envía nada.')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { guideTestScene: { requests: number } }).guideTestScene.requests)).toBe(0);
  await page.screenshot({ path: testInfo.outputPath('guia-uso.png') });
  await sheet.getByRole('button', { name: 'Entendido' }).click();
  await expect(page.locator('.anatomy-status')).toHaveText('Buscando…');
  const framing = page.getByText('Encuadra a la persona dentro de la silueta');
  const footHint = page.getByText('Incluye el tobillo y parte de la pierna para ver los huesos del pie.');
  await expect(framing).toBeVisible();
  await expect(page.locator('.anatomy-stage-hint')).toHaveCount(0);
  await expect(footHint).toHaveCount(0);
  await expect.poll(async () => {
    const guide = await framing.boundingBox();
    const panel = await page.locator('.anatomy-controls').boundingBox();
    return Boolean(guide && panel && guide.y + guide.height < panel.y);
  }).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('silueta.png') });
  const showPerson = (person: 'partial' | 'full') => page.evaluate(person => {
    (window as unknown as { guideTestScene: { person: string } }).guideTestScene.person = person;
  }, person);
  await showPerson('partial');
  await expect(footHint).toBeVisible({ timeout: 20_000 });
  await expect(framing).toHaveCount(0);
  await showPerson('full');
  await expect(page.locator('.anatomy-status')).toHaveText('Cuerpo completo');
  await expect(framing).toHaveCount(0);
  await expect(footHint).toHaveCount(0);
  await page.getByRole('button', { name: 'Guía de cámara' }).click();
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Entendido' }).click();
  expect(await page.evaluate(() => (window as unknown as { guideTestScene: { requests: number } }).guideTestScene.requests)).toBe(1);
  await page.reload();
  await button.click();
  await expect(page.getByRole('button', { name: 'Detener cámara' })).toBeVisible();
  await expect(sheet).toBeHidden();
});

test('publica el ícono de LumAR y lo muestra a 48 px en un inicio simulado', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/#cuerpo');
  await expect(page).toHaveTitle('LumAR · Atlas de anatomía');
  await expect(page.locator('.app-mark')).toHaveAttribute('src', '/icon.svg');
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest.name).toBe('LumAR');
  expect(manifest.icons.map((icon: { src: string }) => icon.src)).toEqual([
    '/icon-192.png', '/icon-512.png', '/icon-maskable.png',
  ]);
  for (const filename of ['icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable.png', 'apple-touch-icon.png', 'favicon.ico']) {
    expect((await page.request.get('/' + filename)).ok(), filename).toBe(true);
  }
  await page.setContent(`<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      * { box-sizing: border-box }
      html, body { margin: 0; min-height: 100%; font-family: system-ui, sans-serif; color: #133c30; }
      main { min-height: 100dvh; display: grid; place-items: center; background:
        radial-gradient(ellipse at 16% 12%, #e5f5ec 0, transparent 54%),
        radial-gradient(ellipse at 87% 79%, #c4e9d7 0, transparent 58%), #8dc6b1; }
      section { width: min(296px, 100% - 36px); padding: 26px 24px 30px; border-radius: 28px; background: #f8faf7d9; }
      h1 { font-size: 18px; font-weight: 650; margin: 0 0 22px; }
      figure { margin: 0; width: 56px; text-align: center; font-size: 13px; font-weight: 650; }
      img { width: 48px; height: 48px; border-radius: 12px; display: block; margin: 0 auto 6px; }
    </style></head><body><main><section><h1>Pantalla de inicio simulada</h1>
    <figure><img src="/apple-touch-icon.png" alt=""><figcaption>LumAR</figcaption></figure>
    </section></main></body></html>`);
  await expect(page.locator('img')).toHaveCSS('width', '48px');
  await expect.poll(() => page.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(180);
  await page.screenshot({ path: testInfo.outputPath('icono-inicio.png') });
});

test('Créditos reúne las atribuciones y ofrece el estado sin conexión', async ({ page }) => {
  await page.goto('/#progreso/creditos');
  await expect(page.getByRole('heading', { name: 'Créditos' })).toBeVisible();
  for (const text of ['BodyParts3D', 'Pose Landmarker Lite y Full', 'Hand Landmarker', 'Face Landmarker',
    'OpenStax', 'Corazón en corte', 'DM Sans', 'Manrope', 'Lucide', 'three.js', 'Carla y Nicolas']) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
  }
  await expect(page.locator('main')).not.toContainText(/Frasivo/i);
});
