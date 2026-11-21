import { expect, test, type Page } from './returningProfile';

interface MissionTestState { starts: number; timer: number; stream: MediaStream; spoken: { text: string; lang: string; gesture: boolean }[] }
async function missionCamera(page: Page) {
  await page.addInitScript(() => {
    const state: MissionTestState = { starts: 0, timer: 0, stream: null!, spoken: [] };
    (window as unknown as { missionTest: MissionTestState }).missionTest = state;
    window.speechSynthesis.cancel = () => {};
    window.speechSynthesis.speak = utterance => { state.spoken.push({ text: utterance.text, lang: utterance.lang, gesture: navigator.userActivation.isActive }); };
    window.Worker = class {
      onmessage: ((event: { data: unknown }) => void) | null = null;
      onerror: unknown;
      stopped = false;
      postMessage(message: { type: string; frame?: ImageBitmap }) {
        message.frame?.close();
        const data = message.type === 'init' ? { type: 'ready', delegate: 'GPU' } : { type: 'results', inferenceMs: 20, detections: [
          { label: 'book', score: .9, box: { x: .06, y: .2, width: .2, height: .35 } },
          { label: 'chair', score: .85, box: { x: .66, y: .2, width: .2, height: .5 } },
          { label: 'backpack', score: .9, box: { x: .39, y: .5, width: .2, height: .35 } },
        ] };
        setTimeout(() => { if (!this.stopped) this.onmessage?.({ data }); }, 20);
      }
      terminate() { this.stopped = true; clearInterval(state.timer); }
    } as unknown as typeof Worker;
    navigator.mediaDevices.getUserMedia = async () => {
      state.starts++;
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
      const ctx = canvas.getContext('2d')!;
      const draw = () => { ctx.fillStyle = '#dce8d8'; ctx.fillRect(0, 0, 640, 480); ctx.fillStyle = '#9f845c'; ctx.fillRect(38, 96, 128, 168); ctx.fillStyle = '#7e9470'; ctx.fillRect(422, 96, 128, 240); ctx.fillStyle = '#52796d'; ctx.fillRect(250, 240, 128, 168); };
      draw(); state.timer = window.setInterval(draw, 40);
      state.stream = canvas.captureStream(25); return state.stream;
    };
  });
}
const mobileNav = (page: Page) => page.getByRole('navigation', { name: 'Navegación móvil', exact: true });
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1' });

test('navegación de misiones distingue exploración libre y reto guiado', async ({ page }) => {
  await page.goto('/');
  await expect(mobileNav(page).getByRole('button')).toHaveCount(5);
  await expect(mobileNav(page).getByRole('button', { name: 'Misiones', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Un reto para tu próxima exploración/ }).click();
  await expect(page.locator('.mission-intro')).toBeVisible();
  await expect(mobileNav(page).getByRole('button', { name: 'Misiones', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.mission-object-preview')).toContainText('Book');
  await expect(page.locator('.mission-object-preview')).toContainText('Chair');
  await expect(page.locator('.mission-object-preview')).toContainText('Backpack');
  await page.screenshot({ path: 'docs/mission-intro-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('misión completa conserva audio por gesto, cámara única, ejercicio pausado y 60 puntos', async ({ page }) => {
  await missionCamera(page);
  await page.goto('/');
  await mobileNav(page).getByRole('button', { name: 'Misiones', exact: true }).click();
  await page.getByRole('button', { name: 'Empezar y escuchar', exact: true }).tap();
  await expect(page.locator('.ar-tag')).toHaveCount(3);
  await page.locator('.ar-tag[data-word-id="chair"]').tap();
  await expect(page.locator('.mission-notice')).toContainText('El reto pide Book');
  await expect(page.locator('.points')).toHaveText('0 puntos');
  await page.getByRole('button', { name: 'Escuchar reto', exact: true }).tap();
  for (const [index, id] of ['book', 'chair', 'backpack'].entries()) {
    await page.locator(`.ar-tag[data-word-id="${id}"]`).tap();
    await expect(page.locator('.mission-banner')).toContainText(`¡Encontraste ${id === 'book' ? 'Book' : id === 'chair' ? 'Chair' : 'Backpack'}!`);
    await expect(page.locator('.points')).toHaveText(`${(index + 1) * 10} puntos`);
    if (index === 0) { await page.locator('.ar-tag[data-word-id="book"]').tap(); await expect(page.locator('.points')).toHaveText('10 puntos'); }
    if (index === 1) await page.screenshot({ path: 'docs/mission-camera-mobile.png', fullPage: true });
    await page.getByRole('button', { name: index < 2 ? 'Siguiente objeto' : 'Empezar ejercicios', exact: true }).tap();
  }
  expect(await page.evaluate(() => (window as unknown as { missionTest: MissionTestState }).missionTest.starts)).toBe(1);
  const spoken = await page.evaluate(() => (window as unknown as { missionTest: MissionTestState }).missionTest.spoken);
  for (const text of ['Find a book.', 'Find a chair.', 'Find a backpack.']) expect(spoken.some(s => s.text === text && s.lang === 'en-US' && s.gesture)).toBe(true);
  await expect(page.locator('.mission-practice .practice-top')).toContainText('1 de 3');
  await page.locator('.mission-practice .answer-option').filter({ hasText: 'Book' }).tap();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).tap();
  const answer = page.locator('.mission-practice').getByLabel('Palabra en inglés');
  await answer.fill('cha');
  await mobileNav(page).getByRole('button', { name: /^Mis palabras/ }).tap();
  await mobileNav(page).getByRole('button', { name: 'Misiones', exact: true }).tap();
  await expect(answer).toHaveValue('cha');
  await answer.fill('chair');
  await page.getByRole('button', { name: 'Comprobar', exact: true }).tap();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).tap();
  await page.locator('.mission-practice .answer-option').filter({ hasText: 'Mochila' }).tap();
  await page.getByRole('button', { name: 'Ver resumen', exact: true }).tap();
  await expect(page.locator('.mission-summary')).toContainText('Misión completada');
  await expect(page.locator('.mission-summary .summary-stats')).toContainText('60');
  await expect(page.locator('.points')).toHaveText('60 puntos');
  expect(await page.evaluate(() => (window as unknown as { missionTest: MissionTestState }).missionTest.stream.getTracks().every(t => t.readyState === 'ended'))).toBe(true);
  await page.screenshot({ path: 'docs/mission-summary-mobile.png', fullPage: true });
  await page.reload(); await expect(page.locator('.points')).toHaveText('60 puntos');
});
