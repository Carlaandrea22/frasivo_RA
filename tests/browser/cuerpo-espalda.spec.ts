import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { activateBodyCamera } from './body-camera';

test('la cámara de 375 px muestra los huesos de la espalda con etiquetas bilingües', async ({ page }, testInfo) => {
  const photo = `data:image/jpeg;base64,${(await readFile('tests/fixtures/pose-back.jpg')).toString('base64')}`;
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(photo => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: async () => {
        const image = new Image();
        image.src = photo;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = 550;
        canvas.height = 980;
        const ctx = canvas.getContext('2d')!;
        const width = image.width * canvas.height / image.height;
        let tick = 0;
        const draw = () => ctx.drawImage(image, (canvas.width - width) / 2 + Math.sin(tick++ * .28), 0, width, canvas.height);
        draw();
        const timer = setInterval(draw, 55);
        const stream = canvas.captureStream(18);
        const track = stream.getVideoTracks()[0];
        const stop = track.stop.bind(track);
        track.stop = () => { clearInterval(timer); stop(); };
        return stream;
      },
    });
  }, photo);
  await page.goto('/#cuerpo');
  await activateBodyCamera(page);
  await expect(page.locator('.anatomy-status')).toHaveText('Espalda');
  const sprite = (id: string) => page.locator(`[data-rendered=bones] image[data-part="${id}"]`);
  for (const id of ['spine', 'ribs_left', 'ribs_right', 'sacrum', 'pelvis_left', 'pelvis_right']) {
    await expect(sprite(id)).toBeVisible();
    await expect(sprite(id)).toHaveAttribute('href', new RegExp(`${id}_back`));
  }
  for (const id of ['scapula_left', 'scapula_right', 'humerus_left']) await expect(sprite(id)).toBeVisible();
  for (const id of ['sternum', 'clavicle_left', 'patella_left', 'mandible', 'femur_left', 'tibia_right']) {
    await expect(sprite(id)).toHaveCount(0);
  }

  await page.getByRole('button', { name: 'Minimizar controles' }).click();
  await page.getByRole('button', { name: 'Etiquetas', exact: true }).click();
  const scapula = page.locator('[data-anatomy-label=scapula]');
  await expect(scapula.getByText('Escápula', { exact: true })).toBeVisible();
  await expect(scapula.getByText('Scapula', { exact: true })).toBeVisible();
  const sacrum = page.locator('[data-anatomy-label=sacrum]');
  await expect(sacrum.getByText('Sacro', { exact: true })).toBeVisible();
  await expect(sacrum.getByText('Sacrum', { exact: true })).toBeVisible();
  await expect(page.locator('[data-anatomy-arrow=scapula]')).toHaveAttribute('data-bone-source', /^scapula_(left|right)$/);
  await expect(page.locator('[data-anatomy-arrow=sacrum]')).toHaveAttribute('data-bone-source', 'sacrum');
  const ribs = page.locator('[data-anatomy-arrow=ribs]');
  await expect(ribs).toHaveAttribute('data-bone-source', /^ribs_(left|right)$/);
  const { distance, side, column, ribU, lateralU } = await ribs.evaluate(node => {
    const rib = node as SVGLineElement;
    const spine = document.querySelector<SVGLineElement>('[data-anatomy-arrow=spine]')!;
    const tip = (line: SVGLineElement) => new DOMPoint(line.x2.baseVal.value, line.y2.baseVal.value)
      .matrixTransform(line.getScreenCTM()!);
    const a = tip(rib), b = tip(spine);
    const source = document.querySelector<SVGImageElement>(`image[data-part="${rib.dataset.boneSource}"]`)!;
    const local = a.matrixTransform(source.getScreenCTM()!.inverse());
    const ribU = (local.x - source.x.baseVal.value) / source.width.baseVal.value;
    return { distance: Math.hypot(a.x-b.x, a.y-b.y), side: a.x < b.x ? 'left' : 'right', ribU,
      lateralU: rib.dataset.boneSource === 'ribs_left' ? .82 : .18,
      column: document.querySelector<HTMLElement>('[data-anatomy-label=ribs]')!.dataset.labelSide };
  });
  expect(distance).toBeGreaterThanOrEqual(40);
  expect(side).toBe(column);
  expect(ribU).toBeCloseTo(lateralU, 1);
  await page.screenshot({ path: testInfo.outputPath('huesos-espalda-375.png') });
  await scapula.getByRole('button', { name: 'Ver ficha de Escápula' }).click();
  await expect(page.getByRole('dialog', { name: 'Escápula' })).toBeVisible();
});
