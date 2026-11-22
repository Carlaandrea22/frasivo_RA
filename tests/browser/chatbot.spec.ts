import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, test, type Page } from '@playwright/test';

const suggestions = [
  '¿Cómo se dice clavícula en inglés?',
  'Explícame el fémur',
  'Hazme 3 preguntas de músculos',
  '¿Qué diferencia hay entre tendon y ligament?',
];
const femurQuestion = suggestions[1];
const tutorReply = 'El [[en:femur]] es el hueso **más largo** del cuerpo.\n\n- Está en el muslo.\n- Se une a la [[en:patella]] en la rodilla.';
const chatPath = '/api/chat';
const sseType = 'text/event-stream';
const offlineMessage = 'Necesitas internet para usar el chat';
const errorMessage = /El chat no está disponible/;

function delta(text: string) {
  return `event: delta\ndata: ${JSON.stringify({ text })}\n\n`;
}

function reply(text: string) {
  return delta(text) + 'event: done\ndata: {}\n\n';
}

const messageBox = (page: Page) => page.getByRole('textbox', { name: 'Mensaje' });
const chatLog = (page: Page) => page.getByRole('log');

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 22, 8));
  await page.addInitScript(() => { Math.random = () => .99; });
});

test.describe('chat con API simulada', () => {
  test.use({ serviceWorkers: 'block' });

  test('mantiene la caja de texto sobre la barra cuando se abre el teclado móvil', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 812 });
    await page.goto('/#chatbot');
    const box = messageBox(page);
    await box.focus();
    await box.fill('Una línea de texto.\n'.repeat(6));
    await page.evaluate(() => {
      const viewport = window.visualViewport!;
      Object.defineProperties(viewport, { height: { value: 365 }, offsetTop: { value: 30 } });
      viewport.dispatchEvent(new Event('resize'));
    });

    const nav = page.getByRole('navigation', { name: 'Navegación principal' });
    await expect.poll(async () => (await nav.boundingBox())!.y + (await nav.boundingBox())!.height)
      .toBeCloseTo(395);
    const field = (await box.boundingBox())!;
    expect(field.y + field.height).toBeLessThanOrEqual((await nav.boundingBox())!.y);
    await expect(box).toBeFocused();
    expect(await box.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  });

  test('muestra el primer fragmento antes del final y cancela la respuesta al detener', async ({ page }) => {
    const partial = 'El fémur está en el muslo.';
    let disconnected = false;
    const server = createServer((_request, response) => {
      response.on('close', () => { disconnected = true; });
      response.writeHead(200, { 'Content-Type': sseType });
      response.write(delta(partial));
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));

    try {
      const { port } = server.address() as AddressInfo;
      await page.route(chatPath, async route => {
        expect(route.request().method()).toBe('POST');
        expect(route.request().postDataJSON()).toEqual({
          messages: [{ role: 'user', content: femurQuestion }],
        });
        await route.continue({ url: `http://127.0.0.1:${port}${chatPath}` });
      });
      await page.goto('/#chatbot');
      await page.getByRole('button', { name: femurQuestion, exact: true }).click();

      await expect(page.getByText(partial, { exact: true })).toBeVisible();
      await expect(page.getByText(/escribiendo/i)).toBeVisible();
      await expect(chatLog(page)).toHaveAttribute('aria-live', 'polite');
      await expect(chatLog(page)).not.toContainText(partial);
      const stop = page.getByRole('button', { name: 'Detener', exact: true });
      await stop.click();

      await expect.poll(() => disconnected).toBe(true);
      await expect(chatLog(page)).toContainText(partial);
      await expect(stop).toBeHidden();
      await expect(page.getByRole('button', { name: 'Reintentar' })).toBeHidden();
      await expect(messageBox(page)).toBeFocused();
    } finally {
      server.closeAllConnections();
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });

  test('reintenta un error del stream sin duplicar la pregunta', async ({ page }) => {
    const payloads: unknown[] = [];
    const recovered = 'La rótula protege la parte anterior de la rodilla.';
    await page.route(chatPath, async route => {
      expect(route.request().method()).toBe('POST');
      payloads.push(route.request().postDataJSON());
      await route.fulfill({
        contentType: sseType,
        body: payloads.length === 1
          ? delta('La rótula') + 'event: error\ndata: {"code":"no_disponible"}\n\n'
          : reply(recovered),
      });
    });
    await page.goto('/#chatbot');
    await messageBox(page).fill('¿Qué es la rótula?');
    await page.getByRole('button', { name: 'Enviar', exact: true }).click();

    await expect(page.getByText(errorMessage)).toBeVisible();
    await expect(page.getByText('La rótula', { exact: true })).toBeVisible();
    await expect(chatLog(page).getByText('La rótula', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
    await expect(chatLog(page).getByText(recovered, { exact: true })).toBeVisible();
    await expect(chatLog(page).getByText('¿Qué es la rótula?', { exact: true })).toHaveCount(1);
    await expect(page.getByText('La rótula', { exact: true })).toHaveCount(0);
    await expect(page.getByText(errorMessage)).toBeHidden();
    await expect(messageBox(page)).toBeFocused();

    const message = { role: 'user', content: '¿Qué es la rótula?' };
    expect(payloads).toEqual([{ messages: [message] }, { messages: [message] }]);
  });

  test('conserva saltos e historial hasta confirmar una nueva conversación', async ({ page }) => {
    const question = '¿Dónde está la tibia?\nDame un ejemplo.';
    const answer = 'La tibia está en la pierna, entre la rodilla y el tobillo.';
    await page.route(chatPath, async route => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().postDataJSON()).toEqual({
        messages: [{ role: 'user', content: question }],
      });
      await route.fulfill({ contentType: sseType, body: reply(answer) });
    });
    await page.goto('/#chatbot');
    const box = messageBox(page);
    await box.fill('¿Dónde está la tibia?');
    await box.press('Shift+Enter');
    await box.pressSequentially('Dame un ejemplo.');
    await expect(box).toHaveValue(question);
    await expect(chatLog(page).getByText('¿Dónde está la tibia?')).toHaveCount(0);
    await box.press('Enter');
    await expect(chatLog(page).getByText(answer, { exact: true })).toBeVisible();
    await expect(box).toBeFocused();

    await page.reload();
    await expect(chatLog(page)).toContainText('¿Dónde está la tibia? Dame un ejemplo.');
    await expect(chatLog(page).getByText(answer, { exact: true })).toBeVisible();

    const reset = page.getByRole('button', { name: 'Nueva conversación', exact: true });
    const dialog = page.getByRole('dialog', { name: '¿Empezar una nueva conversación?' });
    await reset.click();
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(chatLog(page).getByText(answer, { exact: true })).toBeVisible();
    await reset.click();
    await dialog.getByRole('button', { name: 'Empezar de nuevo', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(box).toBeFocused();
    await page.reload();
    await expect(page.getByRole('button', { name: femurQuestion, exact: true })).toBeVisible();
    await expect(page.getByText(answer, { exact: true })).toHaveCount(0);
  });

  for (const width of [320, 375]) {
    test.describe(`chat a ${width} px`, () => {
      test.use({
        viewport: { width, height: 812 },
        isMobile: true,
        hasTouch: true,
        reducedMotion: 'reduce',
      });

      test('muestra las sugerencias, el texto formateado, audio y enlace al atlas', async ({ page }, testInfo) => {
        await page.route(chatPath, async route => {
          expect(route.request().method()).toBe('POST');
          expect(route.request().postDataJSON()).toEqual({
            messages: [{ role: 'user', content: femurQuestion }],
          });
          await route.fulfill({ contentType: sseType, body: reply(tutorReply) });
        });
        await page.goto('/#chatbot');
        for (const suggestion of suggestions) {
          await expect(page.getByRole('button', { name: suggestion, exact: true })).toBeVisible();
        }
        await expect(page.getByText(/No escribas datos personales ni de salud/)).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`chat-vacio-${width}.png`) });

        await page.getByRole('button', { name: femurQuestion, exact: true }).click();
        const log = chatLog(page);
        await expect(log.getByText(femurQuestion, { exact: true })).toBeVisible();
        await expect(log.locator('strong')).toHaveText('más largo');
        await expect(log.getByRole('listitem').filter({ hasText: /^Está en el muslo\.$/ })).toBeVisible();
        await expect(log.getByRole('listitem').filter({ hasText: /^Se une a la patella en la rodilla\.$/ })).toBeVisible();
        const femurAudio = log.getByRole('button', { name: 'Escuchar femur', exact: true });
        await expect(femurAudio).toBeEnabled();
        await expect(log.getByRole('button', { name: 'Escuchar patella', exact: true })).toBeEnabled();
        await expect(log.getByRole('link', { name: /^Ver en Explorar 3D \(Fémur\)$/ }))
          .toHaveAttribute('href', '#explorar/estructura/femur');
        await page.screenshot({ path: testInfo.outputPath(`chat-conversacion-${width}.png`) });

        const audio = page.waitForResponse(response => /\/femur-[^/]+\.mp3$/.test(new URL(response.url()).pathname));
        await femurAudio.click();
        expect((await audio).ok()).toBe(true);
      });

      test('explica el estado cuando el chat no está activado', async ({ page }, testInfo) => {
        await page.route(chatPath, async route => {
          expect(route.request().method()).toBe('POST');
          await route.fulfill({ status: 503, json: { code: 'no_configurado' } });
        });
        await page.goto('/#chatbot');
        await page.getByRole('button', { name: femurQuestion, exact: true }).click();
        await expect(page.getByText('El chat aún no está activado', { exact: false })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Reintentar', exact: true })).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`chat-error-${width}.png`) });
      });
    });
  }
});

for (const width of [320, 375]) {
  test.describe(`PWA sin conexión a ${width} px`, () => {
    test.use({
      viewport: { width, height: 812 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'reduce',
    });

    test('excluye /api/ de la caché y conserva el resto de LumAR', async ({ page, context }, testInfo) => {
      await page.goto('/#chatbot');
      await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));

      // GET ejercita la exclusión /api/: el worker ya deja pasar cualquier POST.
      await page.route(chatPath, route => route.fulfill({ json: { probe: 'en línea' } }));
      expect(await page.evaluate(async () => (await fetch('/api/chat')).json()))
        .toEqual({ probe: 'en línea' });
      expect(await page.evaluate(async () => {
        const names = await caches.keys();
        const entries = await Promise.all(names.map(async name => (await caches.open(name)).keys()));
        return entries.flat().filter(request => new URL(request.url).pathname.startsWith('/api/')).map(request => request.url);
      })).toEqual([]);
      await page.unroute(chatPath);

      await context.setOffline(true);
      await page.reload();
      await expect(page.getByText(offlineMessage, { exact: false })).toBeVisible();
      expect(await page.evaluate(async () => {
        try {
          await fetch('/api/chat');
          return true;
        } catch {
          return false;
        }
      })).toBe(false);
      await page.screenshot({ path: testInfo.outputPath(`chat-sin-conexion-${width}.png`) });

      await page.getByRole('button', { name: 'Cuerpo', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Activar cámara' })).toBeVisible();
    });
  });
}
