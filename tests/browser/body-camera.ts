import { expect, type Page } from '@playwright/test';

export async function useLiteCpuForCamera(page: Page) {
  await page.evaluate(() => {
    const fixed = Symbol.for('lumar.playwright.lite-cpu');
    const send = Worker.prototype.postMessage;
    if (Reflect.has(send, fixed)) return;
    Worker.prototype.postMessage = function (message, ...transfer) {
      if (message?.type === 'init' && typeof message.diagnostics === 'boolean' && message.model !== 'full') {
        message = { ...message, delegate: 'CPU', adaptive: false };
      }
      Reflect.apply(send, this, [message, ...transfer]);
    };
    Reflect.set(Worker.prototype.postMessage, fixed, true);
  });
}

export async function activateBodyCamera(page: Page) {
  await useLiteCpuForCamera(page);
  const needsGuide = await page.evaluate(() => localStorage.getItem('lumar.body.camera-guide.v1') !== 'true');
  await page.getByRole('button', { name: 'Activar cámara', exact: true }).click();
  if (needsGuide) await page.getByRole('dialog', { name: 'Guía de cámara' }).getByRole('button', { name: 'Entendido' }).click();
}

export async function expectLiveLiteCpu(page: Page) {
  const stage = page.locator('.anatomy-stage');
  await expect(stage).toHaveAttribute('data-pose-state', 'ready');
  await expect(stage).toHaveAttribute('data-pose-model', 'lite');
  await expect(stage).toHaveAttribute('data-pose-delegate', 'CPU');
}

export async function expectPoseReadyToFix(page: Page) {
  await expect(page.locator('.anatomy-stage')).toHaveAttribute('data-pose-fix-state', 'ready');
}
