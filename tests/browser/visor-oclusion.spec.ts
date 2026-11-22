import { build } from 'esbuild';
import { expect, test } from '@playwright/test';

test('el visor oculta la etiqueta de la válvula mitral al girar el corazón', async ({ page }, testInfo) => {
  const fixture = await build({
    bundle: true,
    write: false,
    stdin: {
      resolveDir: process.cwd(),
      contents: `
        import { Mesh } from 'three';
        import { mountViewport } from './src/shared/visor3d/viewport';
        const stage = document.querySelector('#stage');
        const label = document.querySelector('#label');
        const status = document.querySelector('#status');
        let anchors = [{ id: 'mitral', nodeId: 'mitral_valve', point: [.03569, .07362, .02785] }];
        let rays = 0;
        const raycast = Mesh.prototype.raycast;
        Mesh.prototype.raycast = function (...args) { rays++; return raycast.apply(this, args); };
        const onProject = ([point]) => {
          if (!point) return;
          Object.assign(status.dataset, { x: point.x, y: point.y, visible: point.visible });
          label.hidden = !point.visible;
          label.style.left = point.x + 'px';
          label.style.top = point.y + 'px';
          status.textContent = point.visible ? 'Válvula mitral visible' : 'Válvula mitral oculta por el modelo';
        };
        const runtime = mountViewport(stage, '/corazon-de-prueba.glb', undefined, 'instructions',
          () => ({ anchors, onProject }), state => { stage.dataset.state = state; });
        window.idleRaycasts = () => {
          const before = rays;
          runtime.sync();
          anchors = anchors.map(anchor => ({ ...anchor, point: [...anchor.point] }));
          runtime.sync();
          return rays - before;
        };
        document.querySelector('button').onclick = () => runtime.reset();
      `,
    },
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route('**/corazon-de-prueba.glb', route => route.fulfill({
    path: 'assets/anatomy/cardiovascular/heart-cutaway.glb',
    contentType: 'model/gltf-binary',
  }));
  await page.route('**/visor-de-prueba.js', route => route.fulfill({
    body: fixture.outputFiles[0].text, contentType: 'text/javascript',
  }));
  await page.route('**/visor-de-prueba.html', route => route.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html lang="es"><meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { margin: 0; padding: 24px 16px; color: #153b32; background: #f7faf7; font: 16px system-ui; }
        h1 { margin: 0 0 8px; font-size: 24px; }
        #stage { position: relative; height: 440px; overflow: hidden; background: #dcefe5; border-radius: 22px; }
        canvas { position: absolute; width: 100%; height: 100%; }
        #label { position: absolute; padding: 5px 8px; border-radius: 8px; background: white; font-size: 13px; }
        #status { margin: 14px 0; }
        button { padding: 9px 14px; border: 1px solid #176454; border-radius: 12px; background: white; color: inherit; }
      </style>
      <main><h1>Corazón en corte</h1><p id="instructions">Gira el modelo para comprobar sus etiquetas.</p>
        <div id="stage"><span id="label" hidden>Válvula mitral</span></div>
        <p id="status" role="status"></p><button>Restablecer vista</button></main>
      <script src="/visor-de-prueba.js"></script></html>`,
  }));
  await page.goto('/visor-de-prueba.html');
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'ready');
  const label = page.getByText('Válvula mitral', { exact: true });
  await expect(label).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { idleRaycasts: () => number }).idleRaycasts())).toBe(0);

  const canvas = page.getByLabel('Modelo en 3D');
  for (let step = 0; step < 18; step++) await canvas.press('ArrowRight');
  await expect(label).toBeHidden();
  const status = page.getByRole('status');
  await expect(status).toHaveText('Válvula mitral oculta por el modelo');
  const inFrame = await status.evaluate(node => {
    const { x, y } = (node as HTMLElement).dataset;
    const stage = document.querySelector('#stage')!;
    return Number(x) > 0 && Number(x) < stage.clientWidth && Number(y) > 0 && Number(y) < stage.clientHeight;
  });
  expect(inFrame).toBe(true);
  await canvas.blur();
  await page.screenshot({ path: testInfo.outputPath('corazon-etiqueta-oculta.png') });
  await page.getByRole('button', { name: 'Restablecer vista' }).click();
  await expect(label).toBeVisible();
});
