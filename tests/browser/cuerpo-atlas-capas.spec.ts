import { activateBodyCamera, expectLiveLiteCpu } from './body-camera';
import { readFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const anchors: typeof import('../../assets/anatomy/body/anchors.json') =
  JSON.parse(readFileSync('assets/anatomy/body/anchors.json', 'utf8'));

const shots = {
  full: ['pose-front', 140, 65, 550, 925, 560, 1040],
  trunk: ['pose-front', 257, 48, 315, 440, 610, 910],
  arm: ['pose-front', 245, 140, 220, 500, 560, 1040],
  back: ['pose-back', 0, 0, 500, 753, 550, 980],
} as const;

type Shot = keyof typeof shots;
type Layer = 'Huesos' | 'Músculos' | 'Órganos';

async function openCamera(page: Page, shot: Shot, layer: Layer, debug = false) {
  const [file, x, y, width, height, w, h] = shots[shot];
  const url = 'data:image/jpeg;base64,' + (await readFile(`tests/fixtures/${file}.jpg`)).toString('base64');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(({ url, x, y, width, height, w, h }) => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: async () => {
        const img = new Image();
        img.src = url;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        const zoom = h/height;
        let tick = 0;
        const draw = () => ctx.drawImage(img, x + Math.sin(tick++*.28), y, width, height,
          (w-width*zoom)/2, 0, width*zoom, h);
        draw();
        const id = setInterval(draw, 55);
        const stream = canvas.captureStream(18);
        const track = stream.getVideoTracks()[0];
        const stop = track.stop.bind(track);
        track.stop = () => { clearInterval(id); stop(); };
        return stream;
      },
    });
  }, { url, x, y, width, height, w, h });
  await page.goto(debug ? '/?debug=1#cuerpo' : '/#cuerpo');
  await page.getByRole('button', { name: layer, exact: true }).click();
  await activateBodyCamera(page);
  await expectLiveLiteCpu(page);
}

async function showLabels(page: Page) {
  await page.getByRole('button', { name: 'Minimizar controles' }).click();
  await page.getByRole('button', { name: 'Etiquetas', exact: true }).click();
}

function sprite(page: Page, id: string) {
  return page.locator(`image[data-part="${id}"]`);
}

test('el torso conserva solo los músculos con apoyo visible', async ({ page }, testInfo) => {
  await openCamera(page, 'trunk', 'Músculos');
  await expect(page.locator('.anatomy-stage')).toHaveAttribute('data-body-region', 'Torso', { timeout: 20_000 });
  await expect(sprite(page, 'serratus_anterior_left')).toBeVisible();
  await expect(sprite(page, 'rectus_abdominis_left')).toHaveCount(0);
  await expect(sprite(page, 'quadriceps_femoris_left')).toHaveCount(0);
  await showLabels(page);
  await expect(page.locator('[data-anatomy-label=pectoralis_major]')).toBeVisible();
  const columns = await page.locator('[data-anatomy-label]').evaluateAll(cards => cards.map(card => {
    const { top, bottom } = card.getBoundingClientRect();
    return { side: card.getAttribute('data-label-side'), top, bottom };
  }));
  expect(columns.length).toBeLessThanOrEqual(6);
  for (const side of ['left', 'right']) {
    const column = columns.filter(card => card.side === side).sort((a, b) => a.top-b.top);
    expect(column.every((card, index) => index === 0 || card.top >= column[index-1].bottom)).toBe(true);
  }
  await page.screenshot({ path: testInfo.outputPath('musculos-torso.png') });
  await page.getByRole('button', { name: 'Ver ficha de Pectoral mayor' }).click();
  const detail = page.getByRole('dialog', { name: 'Pectoral mayor' });
  await expect(detail.getByRole('link', { name: 'Ver en Explorar 3D' })).toHaveAttribute('href', '#explorar/estructura/pectoralis_major');
});

test('un brazo visible muestra los músculos de ese brazo y abre su ficha', async ({ page }, testInfo) => {
  await openCamera(page, 'arm', 'Músculos');
  await expect(sprite(page, 'brachioradialis_right')).toBeVisible();
  await expect(sprite(page, 'forearm_flexors_right')).toBeVisible();
  await expect(sprite(page, 'forearm_flexors_left')).toHaveCount(0);
  await showLabels(page);
  await sprite(page, 'biceps_brachii_right').dispatchEvent('click');
  await expect(page.getByRole('dialog', { name: 'Bíceps braquial' })).toBeVisible();
  await expect(page.getByRole('dialog').getByText('Flexiona el codo', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar ficha' }).click();
  await expect(page.locator('[data-anatomy-label=biceps_brachii]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('musculos-brazo.png') });
});

test('las piernas conservan sus segmentos musculares en un cuerpo completo', async ({ page }, testInfo) => {
  await openCamera(page, 'full', 'Músculos');
  for (const part of ['quadriceps_femoris', 'sartorius', 'adductors', 'tibialis_anterior', 'gastrocnemius']) {
    await expect(sprite(page, part + '_left')).toBeVisible();
  }
  await showLabels(page);
  await expect(page.locator('[data-anatomy-label=quadriceps_femoris]')).toBeVisible();
  await expect(page.locator('[data-anatomy-label=tibialis_anterior]')).toBeVisible();
  // Frame the leg labels and their insertion points at the same mobile scale.
  await page.screenshot({ path: testInfo.outputPath('musculos-pierna.png'), clip: { x: 0, y: 350, width: 375, height: 375 } });
});

test('la ventana de órganos de cuerpo completo conserva el tórax y el abdomen', async ({ page }, testInfo) => {
  await openCamera(page, 'full', 'Órganos');
  for (const id of ['lungs', 'heart', 'liver', 'stomach', 'small_intestine', 'large_intestine', 'urinary_bladder']) {
    await expect(sprite(page, id)).toBeVisible();
  }
  await expect(sprite(page, 'kidneys')).toHaveCount(0);
  await showLabels(page);
  await expect(page.locator('[data-organ-window=abdomen]')).toHaveCount(1);
  await expect(page.locator('[data-anatomy-label=heart]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('organos-torso-completo.png') });
  await page.getByRole('button', { name: 'Etiquetas', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('organos-375.png') });
  await sprite(page, 'urinary_bladder').dispatchEvent('click');
  const detail = page.getByRole('dialog', { name: 'Vejiga', exact: true });
  const explore = detail.getByRole('link', { name: 'Ver en Explorar 3D' });
  await expect(explore).toHaveAttribute('href', '#explorar/estructura/urinary_bladder');
  await page.screenshot({ path: testInfo.outputPath('enlace-vejiga.png') });
  await explore.click();
  await expect(page.getByRole('region', { name: 'Modelo 3D de Vejiga urinaria' })).toHaveAttribute('data-viewer-state', 'ready');
});

test('la ventana conserva el tórax sin inventar el abdomen y abre el corazón en corte', async ({ page }, testInfo) => {
  await openCamera(page, 'trunk', 'Órganos');
  await expect(page.locator('.anatomy-stage')).toHaveAttribute('data-body-region', 'Torso');
  await expect(sprite(page, 'heart')).toBeVisible();
  await expect(sprite(page, 'liver')).toBeVisible();
  for (const id of ['small_intestine', 'large_intestine', 'urinary_bladder']) await expect(sprite(page, id)).toHaveCount(0);
  await expect(page.locator('[data-organ-window=abdomen]')).toHaveCount(0);
  await showLabels(page);
  await expect(page.locator('[data-anatomy-label=heart]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('organos-torso-sin-caderas.png') });
  await sprite(page, 'heart').dispatchEvent('click');
  const sheet = page.getByRole('dialog', { name: 'Corazón' });
  await expect(sheet.getByText('Ubicación')).toBeVisible();
  await expect(sheet.getByText('Función')).toBeVisible();
  await sheet.getByRole('link', { name: 'Ver corazón en 3D' }).click();
  await expect(page.getByRole('region', { name: 'Modelo 3D de Corazón' })).toHaveAttribute('data-viewer-state', 'ready');
  expect(await page.evaluate(() => Object.values(localStorage).some(value => value.includes('"itemId":"heart"')))).toBe(true);
});

test('la vista de espalda muestra músculos posteriores y riñones con sus flechas', async ({ page }, testInfo) => {
  await openCamera(page, 'back', 'Músculos');
  await expect(page.locator('.anatomy-stage')).toHaveAttribute('data-body-region', 'Espalda');
  for (const id of ['trapezius_left', 'latissimus_dorsi_left', 'gluteus_maximus_left']) await expect(sprite(page, id)).toBeVisible();
  await expect(sprite(page, 'pectoralis_major_left')).toHaveCount(0);
  await showLabels(page);
  await expect(page.locator('[data-anatomy-label=trapezius]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('musculos-espalda.png') });

  await page.getByRole('button', { name: 'Expandir controles' }).click();
  await page.getByRole('button', { name: 'Órganos', exact: true }).click();
  await page.getByRole('button', { name: 'Minimizar controles' }).click();
  await expect(page.locator('.anatomy-stage')).toHaveAttribute('data-body-region', 'Espalda');
  await expect(sprite(page, 'kidneys')).toBeVisible();
  await expect(sprite(page, 'heart')).toHaveCount(0);
  await expect(page.locator('[data-anatomy-label=kidneys]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('organos-espalda.png') });
});

test('mide el seguimiento de las tres capas y el ajuste de articulaciones de los músculos', async ({ page }, testInfo) => {
  await openCamera(page, 'full', 'Huesos', true);
  const measurements = {};
  for (const layer of ['Huesos', 'Músculos', 'Órganos'] as const) {
    await page.getByRole('button', { name: layer, exact: true }).click();
    await expect(page.locator('.anatomy-stage')).toHaveAttribute('data-body-region', 'Cuerpo completo');
    const rendered = { Huesos: 'bones', Músculos: 'muscles', Órganos: 'organs' }[layer];
    await expect(page.locator(`svg[data-rendered=${rendered}]`)).toHaveAttribute('data-visible-parts', /^[1-9]/);
    const drawingRate = page.locator('[data-fps-drawing]');
    await expect(drawingRate).toHaveAttribute('data-fps-drawing', /^[1-9]/, { timeout: 15_000 });
    await expect.poll(async () => Number(await page.locator('[data-detector=pose]').getAttribute('data-detector-fps')))
      .toBeGreaterThan(0);
    Object.assign(measurements, { [layer]: await page.evaluate(() => ({
      drawing: Number(document.querySelector<HTMLElement>('[data-fps-drawing]')?.dataset.fpsDrawing),
      detectors: Object.fromEntries([...document.querySelectorAll<HTMLElement>('[data-detector]')].map(node =>
        [node.dataset.detector, Number(node.dataset.detectorFps)])),
    })) });
    if (layer === 'Músculos') {
      const segments = [
        ['upper_arm_left', anchors.anchors.shoulder_left, 11], ['upper_arm_left', anchors.anchors.elbow_left, 13],
        ['thigh_left', anchors.anchors.hip_left, 23], ['thigh_left', anchors.anchors.knee_left, 25],
        ['shin_left', anchors.anchors.knee_left, 25], ['shin_left', anchors.anchors.ankle_left, 27],
      ] as const;
      let errors: number[] = [];
      await expect.poll(async () => {
        errors = await page.evaluate(segments => segments.map(([group, [x, y], index]) => {
          const mesh = document.querySelector<SVGGElement>(`[data-atlas-group=${group}]`)?.getScreenCTM();
          const landmark = document.querySelector<SVGGElement>(`[data-landmark="${index}"]`)?.getScreenCTM();
          if (!mesh || !landmark) return Infinity;
          const projected = new DOMPoint(x, -y).matrixTransform(mesh);
          const seen = new DOMPoint(0, 0).matrixTransform(landmark);
          return Math.hypot(projected.x - seen.x, projected.y - seen.y);
        }), segments);
        return Math.max(...errors);
      }).toBeLessThan(15);
      Object.assign(measurements, { projectionErrorPx: errors });
    }
    if (layer === 'Órganos') {
      let ratio: number | null = null;
      await expect.poll(async () => {
        ratio = await page.locator('.anatomy-stage').evaluate(async stage => {
          const lungs = stage.querySelector<SVGImageElement>('image[data-part=lungs]');
          if (!lungs) return null;
          const image = new Image();
          image.src = lungs.href.baseVal;
          await image.decode();
          const canvas = document.createElement('canvas');
          const width = canvas.width = image.naturalWidth;
          const height = canvas.height = image.naturalHeight;
          const context = canvas.getContext('2d')!;
          context.drawImage(image, 0, 0);
          const pixels = context.getImageData(0, 0, width, height).data;
          let left = width, right = 0;
          for (let pixel = 0; pixel < width*height; pixel++) {
            if (pixels[4*pixel+3] < 192) continue;
            const x = pixel % width;
            left = Math.min(left, x);
            right = Math.max(right, x+1);
          }
          const shoulderX = (index: number) =>
            stage.querySelector<SVGGElement>(`[data-landmark="${index}"]`)?.getScreenCTM()?.e;
          const leftShoulder = shoulderX(11), rightShoulder = shoulderX(12);
          if (!lungs.isConnected || leftShoulder === undefined || rightShoulder === undefined) return null;
          return lungs.getBoundingClientRect().width * (right-left)/width / Math.abs(leftShoulder-rightShoulder);
        });
        return ratio !== null && ratio > .86 && ratio < .96;
      }).toBe(true);
      Object.assign(measurements, { lungToShoulderWidth: ratio });
    }
  }
  await writeFile(testInfo.outputPath('fps.json'), JSON.stringify(measurements, null, 2));
});
