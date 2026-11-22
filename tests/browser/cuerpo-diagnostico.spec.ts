import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { activateBodyCamera, expectLiveLiteCpu } from './body-camera';

test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

interface SharedFile { name: string; type: string; text: string }

async function cameraFixture(page: Page, nativeShare: boolean) {
  const source = 'data:image/jpeg;base64,' + (await readFile('tests/fixtures/pose-front.jpg')).toString('base64');
  await page.addInitScript(({ source, nativeShare }) => {
    Object.defineProperty(navigator, 'canShare', {
      value: ({ files }: ShareData) => nativeShare && files?.length === 1 && files[0].type === 'application/json',
    });
    Object.defineProperty(navigator, 'share', {
      value: async ({ files }: ShareData) => {
        const file = files?.[0];
        if (!file) throw new Error('Compartir requiere el archivo.');
        Object.assign(window, { lumarShared: { name: file.name, type: file.type, text: await file.text() } });
      },
    });
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: async () => {
        const photo = new Image();
        photo.src = source;
        await photo.decode();
        const canvas = document.createElement('canvas');
        canvas.width = 560;
        canvas.height = 1040;
        const context = canvas.getContext('2d')!;
        const scale = canvas.height/925;
        const draw = () => context.drawImage(photo, 140, 65, 550, 925, (canvas.width-550*scale)/2, 0, 550*scale, canvas.height);
        draw();
        const stream = canvas.captureStream(20);
        const timer = setInterval(draw, 50);
        const track = stream.getVideoTracks()[0];
        const stop = track.stop.bind(track);
        track.stop = () => { clearInterval(timer); stop(); };
        return stream;
      },
    });
  }, { source, nativeShare });
}

async function openDebugCamera(page: Page) {
  await page.goto('/?debug=1#cuerpo');
  await expect(page.getByRole('button', { name: 'Compartir diagnóstico' })).toBeVisible();
  await activateBodyCamera(page);
  await expectLiveLiteCpu(page);
  await expect(page.locator('.anatomy-stage')).toHaveAttribute('data-body-region', 'Cuerpo completo');
  await expect(page.locator('[data-detector=pose]')).toHaveAttribute('data-detector-frames', /^(?:[5-9]|[1-9]\d+)$/);
  await expect(page.locator('svg[data-rendered=bones]')).toHaveAttribute('data-visible-parts', /^[1-9]/);
}

function expectPrivateDiagnostic(contents: string) {
  const data = JSON.parse(contents);
  expect(Object.keys(data).sort()).toEqual(['commit', 'device', 'engine', 'engineChanges', 'frames',
    'poseFps', 'schemaVersion', 'windowMs']);
  expect(data).toMatchObject({
    schemaVersion: 1,
    windowMs: 15000,
    commit: expect.stringMatching(/^[a-f0-9]{40}$/),
    device: { browser: expect.stringContaining('Chrome'), screen: { width: 375, height: 812 }, orientation: expect.any(String) },
    engine: { model: 'lite', delegate: 'CPU' },
    engineChanges: [{ model: 'lite', delegate: 'CPU', reason: 'cpu-solicitada', timeMs: expect.any(Number) }],
  });
  expect(data.poseFps).toBeGreaterThan(0);
  expect(data.frames.length).toBeGreaterThanOrEqual(5);
  expect(data.frames.at(-1).timeMs-data.frames[0].timeMs).toBeLessThanOrEqual(15000);
  expect(data.frames.some((frame: { region: string; bones: string[] }) =>
    frame.region === 'Cuerpo completo' && frame.bones.includes('skull') && frame.bones.includes('tibia_left'))).toBe(true);
  for (const frame of data.frames) {
    expect(Object.keys(frame).sort()).toEqual(['bones', 'delegate', 'discards', 'layer', 'model', 'region', 'timeMs', 'visibility']);
    expect(frame.visibility).toHaveLength(33);
    expect(frame.visibility.every((score: unknown) => score === null || typeof score === 'number')).toBe(true);
    expect(frame.discards.every((entry: unknown) =>
      Array.isArray(entry) && entry.length === 3 && entry.every(value => typeof value === 'string'))).toBe(true);
  }
  expect(contents).not.toMatch(/data:(?:image|video)|base64|"world"|"landmarks"/i);
}

test('Compartir diagnóstico aparece en debug y abre el selector móvil con un JSON sin medios', async ({ page }) => {
  await cameraFixture(page, true);
  await page.goto('/?fps=1#cuerpo');
  await activateBodyCamera(page);
  await expectLiveLiteCpu(page);
  const button = page.getByRole('button', { name: 'Compartir diagnóstico' });
  await expect(button).toHaveCount(0);
  await openDebugCamera(page);
  await button.click();
  const shared = () => page.evaluate(() => (window as Window & { lumarShared?: SharedFile }).lumarShared);
  await expect.poll(shared).toBeDefined();
  const file = (await shared())!;
  expect(file).toMatchObject({ name: 'lumar-diagnostico.json', type: 'application/json' });
  expectPrivateDiagnostic(file.text);
});

test('descarga el diagnóstico si el navegador carece de uso compartido de archivos', async ({ page }, testInfo) => {
  await cameraFixture(page, false);
  await openDebugCamera(page);
  await page.getByRole('button', { name: 'Detener cámara' }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Compartir diagnóstico' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('lumar-diagnostico.json');
  const path = testInfo.outputPath('lumar-diagnostico.json');
  await download.saveAs(path);
  expectPrivateDiagnostic(await readFile(path, 'utf8'));
  const summary = JSON.parse(execFileSync(process.execPath, ['tests/cuerpo-diagnostico-analizar.mjs', path], { encoding: 'utf8' }));
  expect(summary.completeFrames).toBeGreaterThan(0);
});
