import { expect, test } from '@playwright/test';

const tabs = [
  ['Cuerpo', 'Cuerpo'], ['Explorar 3D', 'Explorar'], ['Practicar', 'Practicar'],
  ['Mi progreso', 'Progreso'], ['Chatbot', 'Chat'],
];

for (const viewport of [
  { width: 320, height: 568 }, { width: 360, height: 800 },
  { width: 375, height: 812 }, { width: 414, height: 896 }, { width: 667, height: 375 },
]) {
  test(`la barra conserva cinco pestañas legibles a ${viewport.width} × ${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('/#chatbot');
    const nav = page.getByRole('navigation', { name: 'Navegación principal' });
    const buttons = nav.getByRole('button');
    const captions = nav.locator('.app-nav-caption');
    await expect(buttons).toHaveCount(tabs.length);
    await expect(captions).toHaveText(tabs.map(([, caption]) => caption));
    for (const [name] of tabs) await expect(nav.getByRole('button', { name, exact: true })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Chatbot' })).toHaveAttribute('aria-current', 'page');
    await page.evaluate(() => document.fonts.ready);

    const buttonBoxes = await buttons.evaluateAll(elements => elements.map(element => {
      const { width, height, top } = element.getBoundingClientRect();
      const icon = element.querySelector('svg')!.getBoundingClientRect();
      return { width, height, top, iconWidth: icon.width };
    }));
    expect(new Set(buttonBoxes.map(({ top }) => top)).size).toBe(1);
    for (const box of buttonBoxes) {
      expect(box.width).toBeGreaterThanOrEqual(48);
      expect(box.height).toBeGreaterThanOrEqual(48);
      expect(box.iconWidth).toBe(24);
    }
    expect(await captions.evaluateAll(elements => elements.every(element => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const text = range.getBoundingClientRect();
      const box = element.parentElement!.getBoundingClientRect();
      return range.getClientRects().length === 1 && text.left >= box.left && text.right <= box.right;
    }))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    if (viewport.width === 320 || viewport.width === 375) {
      await nav.screenshot({ path: testInfo.outputPath(`barra-despues-${viewport.width}.png`) });
    }

    await nav.getByText('Cuerpo', { exact: true }).click();
    const body = page.getByRole('region', { name: 'Cámara corporal' });
    await expect(body).toBeVisible();
    await body.getByRole('button', { name: 'Activar cámara' }).click({ trial: true });
    const controls = (await body.locator('.anatomy-controls').boundingBox())!;
    const bar = (await nav.boundingBox())!;
    expect(controls.y + controls.height).toBeLessThanOrEqual(bar.y);
    expect(bar.y + bar.height).toBeCloseTo(viewport.height);
  });
}
