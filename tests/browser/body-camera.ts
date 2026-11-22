import type { Page } from '@playwright/test';

export async function activateBodyCamera(page: Page) {
  await page.getByRole('button', { name: 'Activar cámara', exact: true }).click();
  const guide = page.getByRole('dialog', { name: 'Guía de cámara' });
  if (await guide.isVisible()) await guide.getByRole('button', { name: 'Entendido' }).click();
}
