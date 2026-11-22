import { activateBodyCamera, expectLiveLiteCpu } from './body-camera';
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

async function cameraPhoto(page: Page, file: string, crop?: [number, number, number, number], shadow = false) {
  const source = `data:image/jpeg;base64,${(await readFile(`tests/fixtures/${file}.jpg`)).toString('base64')}`;
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(({ source, crop, body, shadow }) => {
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
        const scale = body ? 1040/height : Math.min(500/width, 720/height);
        let frame = 0;
        const draw = () => {
          const motion = Math.sin(frame++*.28)*.7;
          context.fillStyle = '#3f4b46';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(photo, x, y, width, height, (560-width*scale)/2+motion,
            body ? 0 : (960-height*scale)/2, width*scale, height*scale);
          if (shadow) {
            const gradient = context.createLinearGradient(0, canvas.height*.47, 0, canvas.height*.74);
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(1, `rgba(12,10,7,${.89+.06*Math.sin(frame*.08)})`);
            context.fillStyle = gradient;
            context.fillRect(0, canvas.height*.47, canvas.width, canvas.height*.53);
          }
        };
        draw();
        const stream = canvas.captureStream(24);
        const timer = setInterval(draw, 40);
        const track = stream.getVideoTracks()[0];
        const stop = track.stop.bind(track);
        track.stop = () => { clearInterval(timer); stop(); };
        return stream;
      },
    });
  }, { source, crop, body: file.startsWith('pose-'), shadow });
}

const scenes = [
  { key: 'mano-abierta', file: 'region-hand-open', status: /^Mano /, metric: 'hand', label: 'carpals' },
  { key: 'mano-doblada', file: 'region-hand-bent', status: /^Mano /, metric: 'hand', label: 'hand_phalanges' },
  { key: 'cabeza-frente', file: 'region-face-front', status: 'Cabeza', metric: 'face', label: 'mandible', crop: [35, 0, 332, 350] },
  { key: 'cabeza-perfil', file: 'region-face-profile', status: 'Cabeza', metric: 'face', label: 'mandible' },
  { key: 'pie', file: 'region-foot', status: /Pie |Buscando…/ },
  { key: 'torso', file: 'pose-front', status: 'Torso', label: 'ribs', crop: [257, 48, 315, 440] },
  { key: 'cuerpo-completo', file: 'pose-front', status: 'Cuerpo completo', label: 'tibia', crop: [140, 65, 550, 925] },
] satisfies { key: string; file: string; status: string | RegExp; metric?: 'hand' | 'face'; label?: string;
  crop?: [number, number, number, number] }[];

for (const scene of scenes) {
  test(`Huesos muestra la región visible en ${scene.key}`, async ({ page }, testInfo) => {
    await cameraPhoto(page, scene.file, scene.crop);
    await page.goto(scene.key === 'pie' ? '/?debug=1#cuerpo' : '/#cuerpo');
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await activateBodyCamera(page);
    await expectLiveLiteCpu(page);
    await page.getByRole('button', { name: 'Minimizar controles' }).click();
    await page.getByRole('button', { name: 'Etiquetas', exact: true }).click();
    await expect(page.locator('.anatomy-stage')).toHaveAttribute('data-body-region', scene.status, { timeout: 20000 });
    const atlas = page.locator('.anatomy-sprites');
    const regional = page.locator('[data-regional-bones]');
    if (scene.label) await expect(page.locator(`[data-bone-label=${scene.label}]`)).toBeVisible();
    if (scene.metric) {
      await expect(atlas).toHaveAttribute('data-visible-parts', '0');
      await expect(regional).toHaveAttribute('data-regional-bones', scene.metric === 'hand' ? '20' : /^(?:[89]|1\d)$/,
        { timeout: 15000 });
      const attribute = `data-${scene.metric}-error-px`;
      const limit = scene.metric === 'hand' ? 8 : 24;
      await expect.poll(async () => Number(await regional.getAttribute(attribute) ?? Infinity)).toBeLessThan(limit);
      testInfo.annotations.push({ type: 'error de proyección', description: `${await regional.getAttribute(attribute)} px` });
    }
    if (scene.key === 'pie') {
      for (const [detector, minimum] of [['pose', 3], ['hand', 2], ['face', 2]] as const) {
        const metrics = page.locator(`[data-detector=${detector}]`);
        await expect(metrics).toHaveAttribute('data-detector-state', 'ready');
        await expect.poll(async () => Number(await metrics.getAttribute('data-detector-frames')), { timeout: 15000 })
          .toBeGreaterThanOrEqual(minimum);
      }
      await expect(page.locator('.anatomy-stage')).toHaveAttribute('data-body-region', scene.status);
      const footLabel = page.locator('[data-bone-label=calcaneus]');
      await expect(footLabel.or(page.getByText('Encuadra a la persona dentro de la silueta'))).toBeVisible();
      await expect(page.getByText('Incluye el tobillo y parte de la pierna para ver los huesos del pie.')).toHaveCount(0);
      await expect(atlas.locator('image[data-part=ribs]')).toHaveCount(0);
      await expect(atlas.locator('image[data-part=skull]')).toHaveCount(0);
    }
    if (scene.key !== 'cuerpo-completo') {
      await expect(page.getByRole('button', { name: 'Fijar esqueleto' })).toBeDisabled();
      if (scene.key !== 'pie') {
        await expect(page.locator('#anatomy-pin-reason')).toHaveText(scene.key === 'torso' ? 'Aléjate un poco: se ve solo hasta la cintura'
          : 'Para fijar, aléjate hasta ver el cuerpo completo');
      }
      await expect(atlas.locator('image[data-part=femur_left]')).toHaveCount(0);
    } else {
      await expect(page.getByRole('button', { name: 'Fijar esqueleto' })).toBeEnabled();
      await expect(atlas.locator('image[data-part=femur_left]')).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.querySelectorAll('image[data-part^=foot_phalanges_]').length
        + Number(document.querySelector('[data-regional-feet]')?.getAttribute('data-regional-feet') ?? 0))).toBe(2);
    }
    await page.screenshot({ path: testInfo.outputPath(`${scene.key}.png`) });
    if (scene.key === 'mano-abierta') {
      const arrow = page.locator('line[data-bone-arrow=hand_phalanges]');
      await expect(arrow).toHaveAttribute('data-bone-source', 'phalanx_index_proximal');
      // A horizontal line can have no layout height. Use its projected tip and click in one browser task.
      await arrow.evaluate(node => {
        const line = node as SVGLineElement;
        const tip = new DOMPoint(line.x2.baseVal.value, line.y2.baseVal.value).matrixTransform(line.getScreenCTM()!);
        const hit = document.elementFromPoint(tip.x, tip.y);
        if (!hit) throw new Error('La flecha termina fuera del área visible.');
        hit.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: tip.x, clientY: tip.y }));
      });
      const detail = page.getByRole('dialog', { name: 'Falange proximal del índice' });
      await expect(detail.getByText('Provisional')).toBeVisible();
      const explore = detail.getByRole('link', { name: 'Ver en Explorar 3D' });
      await expect(explore).toHaveAttribute('href', '#explorar/estructura/hand');
      expect(await page.evaluate(() => Object.keys(localStorage).some(key => key.startsWith('lumar.progress:v1:event:')))).toBe(true);
      await page.screenshot({ path: testInfo.outputPath('enlace-mano.png') });
      await explore.click();
      await expect(page.getByRole('region', { name: 'Modelo 3D de Mano ósea derecha' })).toHaveAttribute('data-viewer-state', 'ready');
    }
  });
}


test('el atlas conserva ambas piernas y pies con el torso iluminado y las piernas en sombra', async ({ page }) => {
  await cameraPhoto(page, 'pose-front', [140, 65, 550, 925], true);
  await page.goto('/?debug=1#cuerpo');
  await activateBodyCamera(page);
  await expectLiveLiteCpu(page);
  await expect(page.locator('.anatomy-stage')).toHaveAttribute('data-body-region', 'Cuerpo completo', { timeout: 20000 });
  for (const side of ['left', 'right']) {
    for (const bone of ['humerus', 'radius', 'ulna', 'femur', 'tibia', 'fibula']) {
      await expect(page.locator(`image[data-part=${bone}_${side}]`)).toBeVisible();
    }
  }
  await expect.poll(() => page.evaluate(() => document.querySelectorAll('image[data-part^=foot_phalanges_]').length
    + Number(document.querySelector('[data-regional-feet]')?.getAttribute('data-regional-feet') ?? 0))).toBe(2);
  await expect(page.getByText(/Aléjate un poco/)).toHaveCount(0);
});

test('una persona sentada mantiene el torso y evita prolongar rodillas flexionadas', async ({ page }) => {
  await cameraPhoto(page, 'pose-seated');
  await page.goto('/?debug=1#cuerpo');
  await activateBodyCamera(page);
  await expectLiveLiteCpu(page);
  await expect(page.locator('image[data-part=spine]')).toBeVisible({ timeout: 20000 });
  await expect.poll(() => page.locator('.anatomy-debug').evaluate(node => {
    const support: [number, string][] = JSON.parse(node.getAttribute('data-pose-support') ?? '[]');
    return support.some(([index, source]) => (index === 25 || index === 26) && source === 'inferred');
  })).toBe(false);
});
