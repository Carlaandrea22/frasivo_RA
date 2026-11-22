import { activateBodyCamera } from './body-camera';
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

async function cameraPhoto(page: Page, file: string, crop?: [number, number, number, number]) {
  const source = `data:image/jpeg;base64,${(await readFile(`tests/fixtures/${file}.jpg`)).toString('base64')}`;
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(({ source, crop, body }) => {
    const results = { pose: 0, hand: 0, face: 0 };
    Object.assign(window, { regionTestResults: results });
    window.Worker = class extends Worker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener('message', ({ data }) => {
          if (data.type === 'pose' || data.type === 'hand' || data.type === 'face') results[data.type as keyof typeof results]++;
        });
      }
    };
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
  }, { source, crop, body: file === 'pose-front' });
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
    await page.goto('/#cuerpo');
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await activateBodyCamera(page);
    await page.getByRole('button', { name: 'Minimizar controles' }).click();
    await page.getByRole('button', { name: 'Etiquetas', exact: true }).click();
    await expect(page.locator('.anatomy-status')).toHaveText(scene.status, { timeout: 20000 });
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
      await page.waitForFunction(() => {
        const { pose, hand, face } = (window as unknown as { regionTestResults: Record<string, number> }).regionTestResults;
        return pose >= 3 && hand >= 2 && face >= 2;
      }, undefined, { timeout: 15000 });
      const footLabel = page.locator('[data-bone-label=calcaneus]');
      await expect(footLabel.or(page.getByText('Incluye el tobillo y parte de la pierna para ver los huesos del pie.'))).toBeVisible();
      await expect(atlas.locator('image[data-part=ribs]')).toHaveCount(0);
      await expect(atlas.locator('image[data-part=skull]')).toHaveCount(0);
    }
    if (scene.key !== 'cuerpo-completo') {
      await expect(page.getByRole('button', { name: 'Fijar esqueleto' })).toBeDisabled();
      if (scene.key === 'pie') {
        await expect(page.locator('#anatomy-pin-reason')).toHaveText(/Incluye el tobillo|Para fijar/);
        await expect(page.locator('.anatomy-stage-hint > span')).toHaveCount(1);
      } else await expect(page.locator('#anatomy-pin-reason')).toHaveText('Para fijar, aléjate hasta ver el cuerpo completo');
      await expect(atlas.locator('image[data-part=femur_left]')).toHaveCount(0);
    } else {
      await expect(page.getByRole('button', { name: 'Fijar esqueleto' })).toBeEnabled();
      await expect(atlas.locator('image[data-part=femur_left]')).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.querySelectorAll('image[data-part^=foot_phalanges_]').length
        + Number(document.querySelector('[data-regional-feet]')?.getAttribute('data-regional-feet') ?? 0))).toBe(2);
    }
    await page.screenshot({ path: testInfo.outputPath(`${scene.key}.png`) });
    if (scene.key === 'mano-abierta') {
      const tip = await page.locator('line[data-bone-arrow=hand_phalanges]').evaluate(node => {
        const line = node as SVGLineElement;
        const point = new DOMPoint(line.x2.baseVal.value, line.y2.baseVal.value).matrixTransform(line.getScreenCTM()!);
        return { x: point.x, y: point.y };
      });
      await page.mouse.click(tip.x, tip.y);
      const detail = page.getByRole('dialog', { name: 'Falange proximal del índice' });
      await expect(detail.getByText('Provisional')).toBeVisible();
      await expect(detail.getByRole('link', { name: 'Ver en Explorar 3D' })).toHaveCount(0);
      expect(await page.evaluate(() => Object.keys(localStorage).some(key => key.startsWith('lumar.progress:v1:event:')))).toBe(true);
    }
  });
}
