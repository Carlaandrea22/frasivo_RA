import { activateBodyCamera } from './body-camera';
import { readFile } from 'node:fs/promises';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

async function cameraPhoto(page: Page, fixture: string, crop?: [number, number, number, number]) {
  const source = `data:image/jpeg;base64,${(await readFile(`tests/fixtures/${fixture}.jpg`)).toString('base64')}`;
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(({ source, crop }) => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: async () => {
        const photo = new Image();
        photo.src = source;
        await photo.decode();
        const canvas = document.createElement('canvas');
        canvas.width = 560;
        canvas.height = 1040;
        const context = canvas.getContext('2d')!;
        const [x, y, width, height] = crop ?? [0, 0, photo.naturalWidth, photo.naturalHeight];
        const scale = Math.min(500/width, 720/height);
        let frame = 0;
        const draw = () => {
          context.fillStyle = '#3f4b46';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(photo, x, y, width, height, (560-width*scale)/2+Math.sin(frame++*.28)*.7,
            (960-height*scale)/2, width*scale, height*scale);
        };
        draw();
        const stream = canvas.captureStream(24);
        const timer = window.setInterval(draw, 40);
        const track = stream.getVideoTracks()[0];
        const stop = track.stop.bind(track);
        track.stop = () => { window.clearInterval(timer); stop(); };
        return stream;
      },
    });
  }, { source, crop });
}

async function activate(page: Page, name: 'Músculos' | 'Órganos') {
  await page.goto('/?fps=1#cuerpo');
  await page.getByRole('button', { name, exact: true }).click();
  await activateBodyCamera(page);
  await page.getByRole('button', { name: 'Minimizar controles' }).click();
  await page.getByRole('button', { name: 'Etiquetas', exact: true }).click();
}

async function metrics(page: Page, testInfo: TestInfo, attribute: 'data-hand-error-px' | 'data-face-error-px') {
  const regional = page.locator('[data-regional-layer]');
  await expect.poll(async () => Number(await regional.getAttribute(attribute) ?? Infinity)).toBeLessThan(
    attribute === 'data-hand-error-px' ? 8 : 24,
  );
  await expect.poll(async () => Number(await page.locator('[data-fps-detection]').getAttribute('data-fps-detection'))).toBeGreaterThan(0);
  await expect.poll(async () => Number(await page.locator('[data-fps-drawing]').getAttribute('data-fps-drawing'))).toBeGreaterThan(24);
  const detection = await page.locator('[data-fps-detection]').getAttribute('data-fps-detection');
  const drawing = await page.locator('[data-fps-drawing]').getAttribute('data-fps-drawing');
  const error = await regional.getAttribute(attribute);
  testInfo.annotations.push({ type: 'seguimiento', description: `${detection} fps de detección, ${drawing} fps de dibujo, ${error} px` });
}

test('Músculos muestra la palma y sus tendones con seguimiento de Hand Landmarker', async ({ page }, testInfo) => {
  await cameraPhoto(page, 'region-hand-open');
  await activate(page, 'Músculos');
  await expect(page.locator('.anatomy-status')).toHaveText(/^Mano /, { timeout: 20000 });
  const regional = page.locator('[data-regional-layer=muscles]');
  await expect(regional).toHaveAttribute('data-hand-view', 'palmar');
  await expect(regional).toHaveAttribute('data-regional-part-ids', /flexor_tendons.*hypothenar_eminence.*thenar_eminence/);
  await expect(regional).not.toHaveAttribute('data-regional-part-ids', /dorsal_interossei|extensor_tendons/);
  const label = page.locator('[data-bone-label=thenar_eminence]');
  await expect(label).toBeVisible();
  await metrics(page, testInfo, 'data-hand-error-px');
  await page.screenshot({ path: testInfo.outputPath('musculos-mano.png') });
  await label.click();
  await expect(page.getByRole('dialog', { name: 'Eminencia tenar' }).getByText('Provisional')).toBeVisible();
});

test('Músculos muestra interóseos y extensores con el dorso de la mano visible', async ({ page }, testInfo) => {
  await cameraPhoto(page, 'region-hand-dorsal');
  await activate(page, 'Músculos');
  await expect(page.locator('.anatomy-status')).toHaveText(/^Mano /, { timeout: 20000 });
  const regional = page.locator('[data-regional-layer=muscles]');
  await expect(regional).toHaveAttribute('data-hand-view', 'dorsal');
  await expect(regional).toHaveAttribute('data-regional-part-ids', 'dorsal_interossei extensor_tendons');
  await expect(page.locator('[data-bone-label=dorsal_interossei]')).toBeVisible();
  await metrics(page, testInfo, 'data-hand-error-px');
  await page.screenshot({ path: testInfo.outputPath('musculos-mano-dorso.png') });
});

test('Músculos deforma la cara sonriente según los puntos de Face Landmarker', async ({ page }, testInfo) => {
  await cameraPhoto(page, 'region-face-front', [35, 0, 332, 350]);
  await activate(page, 'Músculos');
  await expect(page.locator('.anatomy-status')).toHaveText('Cabeza', { timeout: 20000 });
  const regional = page.locator('[data-regional-layer=muscles]');
  await expect(regional).toHaveAttribute('data-regional-part-ids', /frontalis.*orbicularis_oris.*zygomaticus_major/);
  await expect(regional).not.toHaveAttribute('data-regional-part-ids', /sternocleidomastoid/);
  await expect.poll(async () => Number(await regional.getAttribute('data-face-deformation-px'))).toBeGreaterThan(1);
  await expect(page.locator('[data-bone-label=orbicularis_oris]')).toBeVisible();
  await metrics(page, testInfo, 'data-face-error-px');
  await page.screenshot({ path: testInfo.outputPath('musculos-cara.png') });
});

test('Órganos proyecta el cerebro de la cabeza, con el cuello fuera de cuadro', async ({ page }, testInfo) => {
  await cameraPhoto(page, 'region-face-front', [35, 0, 332, 350]);
  await activate(page, 'Órganos');
  await expect(page.locator('.anatomy-status')).toHaveText('Cabeza', { timeout: 20000 });
  const regional = page.locator('[data-regional-layer=organs]');
  await expect(regional).toHaveAttribute('data-regional-part-ids', 'brain');
  await expect.poll(async () => Number(await regional.getAttribute('data-brain-rim-clearance-px'))).toBeGreaterThan(2);
  await expect(page.getByLabel('Órganos de las regiones detectadas')).toBeVisible();
  const label = page.locator('[data-bone-label=brain]');
  await expect(label).toBeVisible();
  await metrics(page, testInfo, 'data-face-error-px');
  await expect(regional).toHaveAttribute('data-regional-part-ids', 'brain');
  await page.screenshot({ path: testInfo.outputPath('organos-cabeza.png') });
  await label.click();
  await expect(page.getByRole('dialog', { name: 'Cerebro' }).getByText('Provisional')).toBeVisible();
});

test('Órganos explica la mano sin órganos internos y cambia de capa', async ({ page }, testInfo) => {
  await cameraPhoto(page, 'region-hand-open');
  await activate(page, 'Órganos');
  await expect(page.locator('.anatomy-status')).toHaveText(/^Mano /, { timeout: 20000 });
  await expect(page.getByText('En esta parte no hay órganos internos. Prueba la capa Huesos o Músculos')).toBeVisible();
  await expect(page.locator('.anatomy-sprites')).toHaveAttribute('data-visible-parts', '0');
  await expect(page.locator('[data-regional-layer=organs]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ver Huesos' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('organos-mano.png') });
  await page.getByRole('button', { name: 'Ver Músculos' }).click();
  await expect(page.locator('[data-regional-layer=muscles]')).toHaveAttribute('data-hand-view', 'palmar');
});
