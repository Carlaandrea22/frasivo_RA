import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => .99; });
});

test('Practicar recomienda el modo clínico con menor acierto y abre un solo caso', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.addInitScript(() => {
    localStorage.setItem('lumar.progress:v1:event:matching-practice', JSON.stringify({
      id: 'matching-practice', kind: 'practice', areaId: 'anatomy', groupId: 'clinical-cases', itemId: 'matching-daily',
      correct: 1, errors: 2, hints: 0, timestamp: new Date(2026, 10, 22, 8).toISOString(),
    }));
  });
  await page.goto('/#practicar');
  const recommendation = page.getByRole('article').filter({ hasText: 'Sugerencia para ti' });
  await expect(recommendation.getByRole('heading', { name: 'Relaciona síntomas y causas' })).toBeVisible();
  await expect(recommendation).toContainText('33% de aciertos');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await recommendation.getByRole('link', { name: 'Empezar práctica' }).click();
  await expect(page.getByText('Caso 1 de 1')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Posibles causas' })).toBeVisible();
});

test('la recomendación de anatomía abre directamente un reto del modo sugerido', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lumar.progress:v1:event:review-practice', JSON.stringify({
      id: 'review-practice', kind: 'practice', areaId: 'anatomy', itemId: 'heart', activityId: 'repaso-musculos',
      correct: 0, errors: 2, hints: 0, timestamp: new Date(2026, 10, 22, 8).toISOString(),
      context: { kind: 'reto', mode: 'evaluacion' },
    }));
  });
  await page.goto('/#practicar');
  await expect(page.getByRole('heading', { name: 'Repaso breve' })).toBeVisible();
  await page.getByRole('link', { name: 'Empezar práctica' }).click();
  await expect(page).toHaveURL(/#practicar\/retos\/modo\/repaso-breve$/);
  await expect(page.getByText(/Pregunta 1 de/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Comprobar', exact: true })).toBeVisible();
});

test('el tablero dibuja la curva durante el arrastre y conserva la conexión al soltar', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/#practicar/casos/modo/matching');
  await expect(page.getByRole('button', { name: 'Comprobar conexiones' })).toBeDisabled();
  const from = await page.locator('[data-match-port="patient:alex"]').boundingBox();
  const to = await page.locator('[data-match-port="cause:motion"]').boundingBox();
  if (!from || !to) throw new Error('No se pudieron medir los puntos del tablero');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await expect(page.locator('.clinical-match-preview')).toHaveAttribute('d', /^M .* C /);
  await page.mouse.up();
  await expect(page.locator('.clinical-match-preview')).toHaveCount(0);
  await expect(page.locator('.clinical-match-wire')).toHaveAttribute('d', /^M .* C /);
  await expect(page.getByText('1 de 3 conexiones')).toBeVisible();
  await page.getByRole('button', { name: 'Caso de Mariana' }).click();
  await page.getByRole('button', { name: /Dolor muscular tardío/ }).click();
  await expect(page.locator('.clinical-match-wire')).toHaveCount(2);
  await page.getByRole('button', { name: 'Reiniciar conexiones' }).click();
  await expect(page.locator('.clinical-match-wire')).toHaveCount(0);
});

test('el tablero permite iniciar conexiones desde las causas con clic o arrastre', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/#practicar/casos/modo/matching');
  const cause = page.getByRole('button', { name: /Dolor muscular tardío/ });
  await cause.click();
  await expect(cause).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Caso de Mariana' }).click();
  await expect(page.locator('[data-match-source="mariana"]')).toHaveAttribute('data-linked', 'true');

  const from = await page.locator('[data-match-port="cause:motion"]').boundingBox();
  const to = await page.locator('[data-match-port="patient:alex"]').boundingBox();
  if (!from || !to) throw new Error('No se pudieron medir los puntos del tablero');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await expect(page.locator('.clinical-match-preview')).toHaveAttribute('d', /^M .* C /);
  await page.mouse.up();
  await expect(page.locator('[data-match-source="alex"]')).toHaveAttribute('data-linked', 'true');
  await expect(page.locator('.clinical-match-wire')).toHaveCount(2);
});

test.describe('arrastre táctil', () => {
  test.use({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });

  for (const direction of ['hacia la causa', 'hacia el caso'] as const) {
    test(`desplaza el tablero y encaja el cable ${direction}`, async ({ page, context }) => {
      await page.goto('/#practicar/casos/modo/matching');
      const forward = direction === 'hacia la causa';
      const patient = '[data-match-port="patient:alex"]';
      const cause = '[data-match-port="cause:motion"]';
      const source = page.locator(forward ? patient : cause);
      const target = forward ? cause : patient;
      await source.scrollIntoViewIfNeeded();
      const initialScroll = await page.evaluate(() => window.scrollY);
      const start = await source.boundingBox();
      if (!start) throw new Error('No se pudo medir el punto de partida');
      const cdp = await context.newCDPSession(page);
      const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', point?: { x: number; y: number }) =>
        cdp.send('Input.dispatchTouchEvent', { type, touchPoints: point ? [{ ...point, id: 1 }] : [] });
      const x = start.x + start.width / 2;
      await send('touchStart', { x, y: start.y + start.height / 2 });
      await expect(page.locator('.clinical-match-preview')).toBeAttached();
      await send('touchMove', { x, y: forward ? 740 : 35 });
      await page.waitForFunction(({ selector, initialScroll, forward }) => {
        const bounds = document.querySelector(selector)?.getBoundingClientRect();
        return bounds && (forward ? window.scrollY > initialScroll : window.scrollY < initialScroll)
          && bounds.top > 120 && bounds.bottom < 630;
      }, { selector: target, initialScroll, forward });
      await send('touchMove', { x, y: forward ? 650 : 95 });
      const end = await page.locator(target).boundingBox();
      if (!end) throw new Error('No se pudo medir el punto de destino');
      await send('touchMove', { x: end.x + end.width + 5, y: end.y + end.height / 2 });
      await send('touchEnd');
      await expect(page.getByText('1 de 3 conexiones')).toBeVisible();
      await expect(page.locator('.clinical-match-wire')).toHaveCount(1);
    });
  }
});
