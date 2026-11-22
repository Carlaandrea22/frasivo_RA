import { readFile, writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

test('la navegación de móvil abre las cuatro secciones y llega a Créditos desde Mi progreso', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Navegación principal' });
  const body = page.getByRole('region', { name: 'Cámara corporal' });
  await expect(body).toBeVisible();
  await expect(nav.getByRole('button', { name: 'Cuerpo' })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('button')).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  const buttons = await page.getByRole('button').evaluateAll(elements =>
    elements.map(element => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })),
  );
  expect(buttons.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);
  expect((await nav.boundingBox())!.y + (await nav.boundingBox())!.height).toBe(812);
  await nav.getByRole('button', { name: 'Explorar 3D' }).click();
  await expect(page.getByRole('heading', { name: 'Explorar 3D' })).toBeVisible();
  await nav.getByRole('button', { name: 'Practicar' }).click();
  await expect(page.getByRole('heading', { name: 'Practicar' })).toBeVisible();
  await nav.getByRole('button', { name: 'Mi progreso' }).click();
  await page.getByRole('button', { name: 'Créditos' }).click();
  await expect(page.getByRole('heading', { name: 'Créditos' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Mi progreso' })).toBeVisible();
});

test('las capas y la opacidad responden y el botón tiene presión, foco y movimiento reducido', async ({ page }) => {
  await page.goto('/');
  const bone = page.getByRole('button', { name: 'Huesos', exact: true });
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Etiquetas' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(bone).toBeFocused();
  await expect(bone).toHaveCSS('outline-style', 'solid');

  const muscles = page.getByRole('button', { name: 'Músculos', exact: true });
  await muscles.hover();
  await page.mouse.down();
  await expect(muscles).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 3)');
  await expect(muscles).toHaveCSS('box-shadow', 'none');
  await page.mouse.up();
  await expect(muscles).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.anatomy-overlay')).toHaveClass(/layer-muscles/);

  await page.getByRole('button', { name: 'Órganos', exact: true }).click();
  await expect(page.locator('[data-rendered=organs] image[data-part=heart]')).toBeVisible();
  const opacity = page.getByRole('slider', { name: 'Opacidad' });
  await opacity.focus();
  await page.keyboard.press('Home');
  await expect(page.locator('.anatomy-overlay')).toHaveCSS('opacity', '0.2');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(muscles).toHaveCSS('transition-duration', '0s');
});

test('el permiso denegado mantiene el atlas de demostración y permite reintentar', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Activar cámara' }).click();
  await expect(page.getByRole('alert')).toContainText('permiso de cámara');
  await expect(page.getByRole('button', { name: 'Activar cámara' })).toBeEnabled();
  await expect(page.locator('[data-part=skull]')).toBeVisible();
});

test('Pose Lite detecta sin conexión tras la primera carga y libera la cámara al salir', async ({ page, context }) => {
  const fixtureUrl = `data:image/jpeg;base64,${(await readFile('tests/fixtures/pose.jpg')).toString('base64')}`;
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(imageUrl => {
    const state = { blank: false, stops: 0, workerStops: 0 };
    Object.assign(window, { poseTest: state });
    const terminate = Worker.prototype.terminate;
    Worker.prototype.terminate = function () {
      state.workerStops++;
      terminate.call(this);
    };
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1000;
        canvas.height = 667;
        const context = canvas.getContext('2d')!;
        const photo = new Image();
        photo.src = imageUrl;
        await photo.decode();
        const draw = () => {
          context.fillStyle = '#153b32';
          context.fillRect(0, 0, canvas.width, canvas.height);
          if (!state.blank) context.drawImage(photo, 0, 0);
        };
        draw();
        const timer = window.setInterval(draw, 80);
        const stream = canvas.captureStream(12);
        const track = stream.getVideoTracks()[0];
        const stop = track.stop.bind(track);
        track.stop = () => {
          state.stops++;
          clearInterval(timer);
          stop();
        };
        return stream;
      },
    });
  }, fixtureUrl);

  await page.goto('/');
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Músculos', exact: true }).click();
  await page.getByRole('button', { name: 'Activar cámara' }).click();
  const status = page.getByRole('status');
  await expect(status).toHaveText('Persona detectada', { timeout: 45000 });
  await expect(page.locator('[data-rendered=muscles] image[data-part=pectoralis_major_left]')).toBeVisible();
  await expect(page.locator('[data-rendered=muscles]')).not.toHaveAttribute('data-visible-parts', '0');
  const video = page.locator('video.visible');
  expect(await video.boundingBox()).toEqual(await page.locator('.anatomy-stage').boundingBox());
  await expect(video).toHaveCSS('object-fit', 'cover');
  await expect(page.locator('.anatomy-sprites')).toHaveAttribute('preserveAspectRatio', 'xMidYMid slice');
  await page.evaluate(() => { (window as unknown as { poseTest: { blank: boolean } }).poseTest.blank = true; });
  await expect(status).toHaveText('Buscando una persona', { timeout: 15000 });
  await expect(page.locator('[data-rendered=muscles]')).toHaveAttribute('data-visible-parts', '0');
  await page.getByRole('button', { name: 'Explorar 3D' }).click();
  await expect.poll(() => page.evaluate(() => {
    const { stops, workerStops } = (window as unknown as { poseTest: { stops: number; workerStops: number } }).poseTest;
    return { stops, workerStops };
  })).toEqual({ stops: 1, workerStops: 1 });
});

test('la pronunciación se muestra deshabilitada cuando falta la voz del dispositivo', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'speechSynthesis', { value: undefined }));
  await page.goto('/');
  await page.getByText('Vocabulario de la capa', { exact: true }).click();
  const sound = page.getByRole('button', { name: 'Escuchar Skull' });
  await expect(sound).toBeDisabled();
  await expect(sound).toHaveCSS('box-shadow', 'none');
  await expect(page.getByRole('heading', { name: 'Skull' })).toBeVisible();
});

test('el atlas y los controles superpuestos siguen fijos al abrir la hoja móvil', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const stage = page.locator('.anatomy-stage');
  const before = (await stage.boundingBox())!;
  const controls = (await page.locator('.anatomy-controls').boundingBox())!;
  expect(before.height).toBeGreaterThan(812 * .78);
  expect(controls.y).toBeGreaterThan(before.y);
  expect(controls.y + controls.height).toBeLessThan(before.y + before.height);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(812);

  const current = page.getByRole('button', { name: 'Cuerpo' });
  const inactive = page.getByRole('button', { name: 'Explorar 3D' });
  await expect(current).toHaveAttribute('aria-current', 'page');
  await expect(current).toHaveCSS('background-color', 'rgb(23, 100, 84)');
  await expect(current).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(inactive).not.toHaveAttribute('aria-current');

  const trigger = page.getByRole('button', { name: 'Vocabulario de la capa' });
  await trigger.click();
  const sheet = page.getByRole('dialog', { name: 'Vocabulario de la capa' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('heading', { name: 'Skull' })).toBeVisible();
  expect(await stage.boundingBox()).toEqual(before);
  expect((await sheet.boundingBox())!.y + (await sheet.boundingBox())!.height).toBe(812);

  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await stage.boundingBox()).toEqual(before);
});

test('el service worker reserva el WASM de compatibilidad para el primer uso', async ({ page, context }) => {
  const wasm = '/body-tracking/wasm/vision_wasm_internal.wasm';
  const fallback = ['/body-tracking/wasm/vision_wasm_nosimd_internal.js', '/body-tracking/wasm/vision_wasm_nosimd_internal.wasm'];
  await page.goto('/');
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const cached = async (path: string) => page.evaluate(async url => Boolean(await caches.match(url)), path);

  expect(await cached(wasm)).toBe(true);
  for (const path of fallback) {
    expect(await cached(path)).toBe(false);
    expect(await page.evaluate(async url => (await fetch(url)).ok, path)).toBe(true);
    expect(await cached(path)).toBe(true);
  }

  await context.setOffline(true);
  for (const path of fallback) {
    expect(await page.evaluate(async url => (await fetch(url, { cache: 'reload' })).ok, path)).toBe(true);
  }
});

test('las tres capas muestran WebP y el vocabulario en inglés y español', async ({ page }) => {
  await page.goto('/?tecnica=b');
  await expect(page.getByRole('group', { name: 'Técnica de huesos' })).toHaveCount(0);
  await expect(page.locator('image[data-part="hand_phalanges_left"]')).toBeVisible();
  await expect(page.locator('image[data-part="foot_phalanges_right"]')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByText('Vocabulario de la capa', { exact: true }).click();
  await page.getByRole('button', { name: 'Mandible Mandíbula', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ver ficha de Mandíbula' })).toBeVisible();
  await expect(page.locator('.anatomy-active-term')).toHaveCount(0);
  await expect(page.locator('image[data-part="mandible"]')).toHaveClass('selected');
  await page.getByRole('button', { name: 'Órganos', exact: true }).click();
  await page.getByRole('button', { name: 'Kidneys Riñones', exact: true }).click();
  await expect(page.locator('.anatomy-active-term')).toHaveText('Kidneys');
  await expect(page.locator('[data-rendered=organs]')).toHaveAttribute('data-focused-organ', 'kidneys');
  await expect(page.locator('[data-rendered=organs] image[data-part=lungs]')).toHaveAttribute('opacity', '0.19');
});

async function useBodyFixture(page: Page) {
  await page.setViewportSize({ width: 375, height: 812 });
  const [front, back] = await Promise.all(['pose-front.jpg', 'pose-back.jpg'].map(async name =>
    `data:image/jpeg;base64,${(await readFile(`tests/fixtures/${name}`)).toString('base64')}`));
  await page.addInitScript(({ front, back }) => {
    const state = { shot: 'front' };
    Object.assign(window, { bodyCameraTest: state });
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: async () => {
        const photos = await Promise.all([front, back].map(async url => {
          const image = new Image();
          image.src = url;
          await image.decode();
          return image;
        }));
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        let tick = 0;
        const draw = () => {
          const framing = state.shot === 'front' ? [140, 65, 550, 925, 560, 1040]
            : state.shot === 'torso' ? [257, 48, 315, 440, 610, 910] : [0, 0, 500, 753, 550, 980];
          const [x, y, width, height, targetWidth, targetHeight] = framing;
          if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
          }
          const zoom = Math.max(canvas.width/width, canvas.height/height);
          const motion = (Math.sin(tick++ * .28) + 1) * 1.5;
          context.drawImage(photos[state.shot === 'back' ? 1 : 0], x + motion, y, width, height,
            (canvas.width - width*zoom)/2, 0, width*zoom, height*zoom);
        };
        draw();
        const timer = setInterval(draw, 55);
        const stream = canvas.captureStream(18);
        const track = stream.getVideoTracks()[0];
        const stop = track.stop.bind(track);
        track.stop = () => { clearInterval(timer); stop(); };
        return stream;
      },
    });
  }, { front, back });
}

test('Pose dibuja tórax frontal sin caderas, retira selección y pide girar de espaldas', async ({ page }) => {
  await useBodyFixture(page);
  await page.goto('/?fps=1');
  await page.getByRole('button', { name: 'Activar cámara' }).click();
  await expect(page.getByRole('status')).toHaveText('Persona detectada');
  await expect(page.getByRole('status')).toHaveCSS('white-space', 'nowrap');
  await expect(page.locator('image[data-part=fibula_right]')).toBeVisible();
  await expect(page.locator('[data-fps-detection]')).toBeVisible();
  await expect(page.locator('[data-fps-drawing]')).toBeVisible();
  await page.getByRole('button', { name: 'Vocabulario de la capa' }).click();
  const fibula = page.getByRole('button', { name: 'Fibula Peroné' });
  await fibula.click();
  await page.getByRole('button', { name: 'Cerrar vocabulario' }).click();
  await page.getByRole('button', { name: 'Minimizar controles' }).click();
  await expect(page.getByRole('button', { name: 'Ver ficha de Peroné' })).toBeVisible();
  await expect(page.locator('.anatomy-active-term')).toHaveCount(0);
  await page.evaluate(() => { (window as unknown as { bodyCameraTest: { shot: string } }).bodyCameraTest.shot = 'torso'; });
  await expect(page.getByText('Aléjate para ver el cuerpo completo')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fijar esqueleto' })).toBeDisabled();
  await expect(page.getByRole('status')).toHaveText('Persona detectada');
  await expect(page.locator('image[data-part=fibula_right]')).toHaveCount(0);
  await expect(page.locator('image[data-part=pelvis_left]')).toHaveCount(0);
  await expect(page.locator('image[data-part=sternum]')).toBeVisible();
  await expect(page.locator('.anatomy-active-term')).toHaveCount(0);
  await page.getByRole('button', { name: 'Expandir controles' }).click();
  await page.getByRole('button', { name: 'Vocabulario de la capa' }).click();
  await expect(fibula).toBeDisabled();
  await page.getByRole('button', { name: 'Cerrar vocabulario' }).click();
  await page.evaluate(() => { (window as unknown as { bodyCameraTest: { shot: string } }).bodyCameraTest.shot = 'back'; });
  await expect(page.getByText('Pídele a la persona que se gire de frente')).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Persona detectada');
  await expect(page.locator('.anatomy-sprites')).toHaveAttribute('data-visible-parts', '0');
});

test('fija la pose de cuerpo completo, muestra el visor y vuelve a la cámara al soltar', async ({ page }, testInfo) => {
  await useBodyFixture(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', { value: 'Android' });
    Object.defineProperty(navigator, 'xr', { value: undefined });
  });
  await page.goto('/?fps=1');
  await page.getByRole('button', { name: 'Activar cámara' }).click();
  const pin = page.getByRole('button', { name: 'Fijar esqueleto' });
  await expect(pin).toBeEnabled();
  await page.getByRole('button', { name: 'Minimizar controles' }).click();
  await expect(page.getByRole('slider', { name: 'Opacidad' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Expandir controles' })).toBeVisible();
  await page.getByRole('button', { name: 'Activar cámara' }).click();
  await expect(pin).toBeEnabled();
  await expect(page.locator('[data-fps-detection]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('captura.png') });
  await pin.click();
  await expect(page.getByText('Quédate quieto 1 segundo')).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: testInfo.outputPath('quieto.png') });
  const space = page.getByRole('button', { name: 'Ver en mi espacio' });
  await expect(space).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Ver en 3D' })).toBeEnabled();
  await expect(page.locator('canvas[aria-label="Esqueleto 3D sobre la cámara"]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('pose-fijada.png') });
  const camera = page.locator('video');
  expect(await camera.evaluate((video: HTMLVideoElement) => (video.srcObject as MediaStream).active)).toBe(true);
  await space.click();
  const viewer = page.getByRole('region', { name: 'Visor del esqueleto 3D' });
  await expect(viewer.locator('canvas')).toBeVisible();
  await expect(viewer).toHaveAttribute('data-bones', '36');
  await expect(page.getByText(/La realidad aumentada requiere Chrome/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('visor-3d.png') });
  const canvas = viewer.locator('canvas');
  await canvas.click({ position: { x: 194, y: 64 } });
  await expect(viewer.getByText('Skull', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('pieza.png') });
  const beforeOrbit = await canvas.screenshot();
  const rect = (await canvas.boundingBox())!;
  await page.mouse.move(rect.x + 180, rect.y + 270);
  await page.mouse.down();
  await page.mouse.move(rect.x + 250, rect.y + 270, { steps: 8 });
  await page.mouse.up();
  expect((await canvas.screenshot()).equals(beforeOrbit)).toBe(false);
  await page.getByRole('button', { name: 'Soltar' }).click();
  await expect(viewer).toHaveCount(0);
  await expect(pin).toBeEnabled();
  await expect(page.locator('image[data-part=fibula_right]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('soltar.png') });
});

test('iPhone recibe un enlace Quick Look con un USDZ de la pose y Soltar libera su Blob', async ({ browser }, testInfo) => {
  const page = await browser.newPage({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1' });
  await useBodyFixture(page);
  await page.addInitScript(() => {
    const original = DOMTokenList.prototype.supports;
    DOMTokenList.prototype.supports = function (token) {
      return token === 'ar' || original.call(this, token);
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Activar cámara' }).click();
  await page.getByRole('button', { name: 'Fijar esqueleto' }).click();
  const canvas = page.locator('canvas[aria-label="Esqueleto 3D sobre la cámara"]');
  await expect(canvas).toBeVisible({ timeout: 20000 });
  const calibrated = page.locator('.anatomy-camera-skeleton');
  await expect(calibrated).toHaveAttribute('data-calibration-points', '9');
  const maximum = Number(await calibrated.getAttribute('data-calibration-max-px'));
  await writeFile(testInfo.outputPath('error-proyeccion-px.txt'), String(maximum));
  expect(maximum).toBeLessThan(15);
  await expect(page.locator('.anatomy-fps')).toHaveCount(0);
  expect(await page.locator('video').evaluate((video: HTMLVideoElement) => (video.srcObject as MediaStream).active)).toBe(true);
  const picker = page.getByLabel('Etiquetas para el visor de Apple');
  await picker.selectOption('main');
  await page.getByRole('button', { name: 'Etiquetas', exact: true }).click();
  await expect(page.locator('[data-bone-arrow=femur]')).toHaveCount(1);
  const ar = page.getByRole('link', { name: 'Ver en mi espacio' });
  await expect(ar).toHaveAttribute('rel', 'ar', { timeout: 20000 });
  await page.screenshot({ path: testInfo.outputPath('modo-sobre-camara.png') });
  await expect(ar.locator('img:only-child')).toHaveCount(1);
  const url = (await ar.getAttribute('href'))!;
  expect(url).toMatch(/^blob:.*#allowsContentScaling=0$/);
  const asset = await page.evaluate(async url => {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }, url);
  expect(asset).toMatch(/^data:model\/vnd\.usdz\+zip;base64,/);
  const file = Buffer.from(asset.split(',')[1], 'base64');
  expect(file.subarray(0, 4)).toEqual(Buffer.from([80, 75, 3, 4]));
  for (const piece of ['Posed_skeleton', 'skull', 'patella_left', 'carpals_left', 'hand_phalanges_right',
    'tarsals_right', 'metatarsals_left', 'foot_phalanges_right']) {
    expect(file.includes(Buffer.from(`"${piece}"`)), piece).toBe(true);
  }
  expect(file.includes(Buffer.from('metersPerUnit = 1'))).toBe(true);
  for (const label of ['"Label_femur"', '"Arrow_tip"', 'textures/Texture_']) {
    expect(file.includes(Buffer.from(label)), label).toBe(true);
  }
  await writeFile(testInfo.outputPath('esqueleto.usdz'), file);
  await page.screenshot({ path: testInfo.outputPath('enlace-quick-look.png') });
  await page.getByRole('button', { name: 'Soltar' }).click();
  expect(await page.evaluate(url => fetch(url).then(() => true, () => false), url)).toBe(false);
  await page.close();
});

test('la cámara dibuja piezas distales y mantiene el cerebro por encima de los ojos del atlas', async ({ page }, testInfo) => {
  await useBodyFixture(page);
  await page.goto('/?fps=1');
  await page.getByRole('button', { name: 'Activar cámara' }).click();
  await expect(page.getByRole('button', { name: 'Fijar esqueleto' })).toBeEnabled();
  await expect(page.locator('[data-fps-drawing]')).toBeVisible();

  async function photograph(name: string) {
    await page.getByRole('button', { name: 'Minimizar controles' }).click();
    await page.screenshot({ path: testInfo.outputPath(`${name}.png`) });
    await page.getByRole('button', { name: 'Expandir controles' }).click();
  }
  for (const side of ['left', 'right']) {
    for (const id of ['tibia', 'fibula', 'patella', 'hand_phalanges', 'foot_phalanges']) {
      await expect(page.locator(`image[data-part=${id}_${side}]`)).toBeVisible();
    }
  }
  await photograph('huesos');
  await page.getByRole('button', { name: 'Músculos', exact: true }).click();
  for (const id of ['gastrocnemius', 'tibialis_anterior', 'biceps_brachii', 'triceps_brachii']) {
    await expect(page.locator(`image[data-part=${id}_left]`)).toBeVisible();
    await expect(page.locator(`image[data-part=${id}_right]`)).toBeVisible();
  }
  await photograph('musculos');
  await page.getByRole('button', { name: 'Órganos', exact: true }).click();
  const brain = page.locator('image[data-part=brain]');
  await expect(brain).toBeVisible();
  expect(await brain.evaluate(node => Number(node.getAttribute('y')) + Number(node.getAttribute('height')))).toBeLessThan(-1.551095);
  await photograph('organos');
});

test('una flecha sigue el hueso y muestra la ficha con enlace solo si existe en el catálogo', async ({ page }, testInfo) => {
  await useBodyFixture(page);
  await page.goto('/?debug=1');
  await page.getByRole('button', { name: 'Activar cámara' }).click();
  await expect(page.locator('[data-landmark]')).toHaveCount(33);
  const femur = page.locator('image[data-part=femur_left]');
  await expect(femur).toBeVisible();
  await femur.dispatchEvent('click');
  await expect(page.locator('[data-bone-arrow=femur]')).toHaveAttribute('marker-end', /^url/);
  await expect(page.getByRole('button', { name: 'Escuchar Femur' })).toBeVisible();
  await page.getByRole('button', { name: 'Ver ficha de Fémur' }).click();
  const sheet = page.getByRole('dialog', { name: 'Fémur' });
  await expect(sheet.getByRole('link', { name: 'Ver en Explorar 3D' })).toHaveAttribute('href', '#explorar/estructura/femur');
  expect(await page.evaluate(() => Object.keys(localStorage).some(key => key.startsWith('lumar.progress:v1:event:')))).toBe(true);
  await sheet.getByRole('button', { name: 'Cerrar ficha' }).click();
  await page.goto('/?fps=1');
  await page.getByRole('button', { name: 'Activar cámara' }).click();
  await expect(page.locator('[data-fps-detection]')).toBeVisible();
  await expect(page.locator('[data-fps-drawing]')).toBeVisible();
  await testInfo.attach('fps', { body: await page.locator('.anatomy-fps').innerText(), contentType: 'text/plain' });
  await page.getByRole('button', { name: 'Minimizar controles' }).click();
  await page.locator('image[data-part=femur_left]').dispatchEvent('click');
  await expect(page.locator('[data-bone-arrow=femur]')).toHaveAttribute('marker-end', /^url/);
  await page.screenshot({ path: testInfo.outputPath('flecha-femur.png') });
  await page.getByRole('button', { name: 'Etiquetas', exact: true }).click();
  await expect(page.locator('[data-bone-arrow]')).toHaveCount(6);
  await page.screenshot({ path: testInfo.outputPath('etiquetas.png') });
  await page.locator('image[data-part=skull]').dispatchEvent('click');
  await page.getByRole('button', { name: 'Ver ficha de Cráneo' }).click();
  const skull = page.getByRole('dialog', { name: 'Cráneo' });
  await expect(skull).toBeVisible();
  await expect(skull.getByRole('link', { name: 'Ver en Explorar 3D' })).toHaveCount(0);
});
