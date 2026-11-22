import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('las tarjetas quedan junto a su hueso y las flechas terminan en píxeles opacos', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const photo = `data:image/jpeg;base64,${(await readFile('tests/fixtures/pose-front.jpg')).toString('base64')}`;
  await page.addInitScript(source => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: async () => {
        const image = new Image();
        image.src = source;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = 560;
        canvas.height = 1040;
        const ctx = canvas.getContext('2d')!;
        const zoom = 1040/925;
        const draw = () => ctx.drawImage(image, 140, 65, 550, 925, (560-550*zoom)/2, 0, 550*zoom, 1040);
        draw();
        const stream = canvas.captureStream(12);
        const timer = setInterval(draw, 80);
        const track = stream.getVideoTracks()[0];
        const stop = track.stop.bind(track);
        track.stop = () => { clearInterval(timer); stop(); };
        return stream;
      },
    });
  }, photo);

  await page.goto('/#cuerpo');
  await page.getByRole('button', { name: 'Activar cámara' }).click();
  await expect(page.locator('image[data-part=femur_left]')).toBeVisible();
  await page.getByRole('button', { name: 'Minimizar controles' }).click();
  await page.getByRole('button', { name: 'Etiquetas', exact: true }).click();
  const arrows = page.locator('line[data-bone-arrow]');
  await expect(arrows).toHaveCount(6);

  const projected = await arrows.evaluateAll(async lines => {
    // Snapshot both transforms before decoding the source textures.
    const samples = lines.map(element => {
      const line = element as SVGLineElement;
      const source = document.querySelector<SVGImageElement>(`image[data-part="${line.dataset.boneSource}"]`)!;
      const tip = new DOMPoint(line.x2.baseVal.value, line.y2.baseVal.value)
        .matrixTransform(line.getScreenCTM()!).matrixTransform(source.getScreenCTM()!.inverse());
      const svg = line.ownerSVGElement!;
      const card = document.querySelector(`[data-bone-label="${line.dataset.boneArrow}"]`)!;
      const panel = document.querySelector('.anatomy-controls')!;
      return {
        id: line.dataset.boneArrow,
        src: source.href.baseVal,
        side: line.dataset.labelSide,
        left: line.x2.baseVal.value < Number(line.dataset.bodyCenter) * svg.clientWidth,
        originLeft: line.x1.baseVal.value < Number(line.dataset.bodyCenter) * svg.clientWidth,
        u: (tip.x - source.x.baseVal.value) / source.width.baseVal.value,
        v: (tip.y - source.y.baseVal.value) / source.height.baseVal.value,
        bottom: card.getBoundingClientRect().bottom,
        panelTop: panel.getBoundingClientRect().top,
      };
    });
    return await Promise.all(samples.map(async sample => {
      const sprite = new Image();
      sprite.src = sample.src;
      await sprite.decode();
      const canvas = document.createElement('canvas');
      canvas.width = sprite.naturalWidth;
      canvas.height = sprite.naturalHeight;
      const context = canvas.getContext('2d')!;
      context.drawImage(sprite, 0, 0);
      const alpha = context.getImageData(Math.floor(sample.u*canvas.width), Math.floor(sample.v*canvas.height), 1, 1).data[3];
      return { ...sample, alpha };
    }));
  });
  expect(new Set(projected.map(label => label.side))).toEqual(new Set(['left', 'right']));
  for (const label of projected) {
    expect(label.side, label.id).toBe(label.left ? 'left' : 'right');
    expect(label.originLeft, label.id).toBe(label.left);
    expect(label.alpha, label.id).toBeGreaterThan(180);
    expect(label.bottom, label.id).toBeLessThanOrEqual(label.panelTop);
  }
});
