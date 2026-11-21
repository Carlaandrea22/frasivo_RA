import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
const [imagePath, reportPath] = process.argv.slice(2);
if (!imagePath) throw new Error('Supply the screenshot used by benchmark-detector.mjs');
const uri = 'data:image/png;base64,' + (await readFile(imagePath)).toString('base64');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173');
  await page.evaluate(({ uri }) => {
    window.benchmarkResults = [];
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args);
        this.addEventListener('message', ({ data }) => {
          if (data.type === 'results') window.benchmarkResults.push({ time: performance.now(), inferenceMs: data.inferenceMs, labels: data.detections.map(r => r.label) });
        });
      }
    };
    navigator.mediaDevices.getUserMedia = async () => {
      const image = new Image(); image.src = uri; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
      const ctx = canvas.getContext('2d');
      const draw = () => ctx.drawImage(image, 291, 151, 951, 711, 0, 0, 640, 480);
      draw();
      window.benchmarkTimer = setInterval(draw, 40);
      return canvas.captureStream(25);
    };
  }, { uri });
  await page.getByRole('button', { name: 'Activar cámara', exact: true }).click();
  await page.waitForFunction(() => window.benchmarkResults.length >= 14, {}, { timeout: 45000 });
  const report = await page.evaluate(() => {
    const samples = window.benchmarkResults.slice(3);
    const intervals = samples.slice(1).map((s, i) => s.time - samples[i].time).sort((a, b) => a - b);
    const medianIntervalMs = intervals[Math.floor(intervals.length / 2)];
    return { source: 'Real app pipeline and detector, synthetic video from the supplied screenshot. Not a live-camera accuracy benchmark.', medianIntervalMs, medianAnalysesPerSecond: 1000 / medianIntervalMs, phoneFrames: samples.filter(s => s.labels.includes('cell phone')).length, frames: samples.length, uiMetrics: document.querySelector('.analysis-speed')?.textContent };
  });
  await page.getByRole('button', { name: 'Detener escaneo', exact: true }).click();
  await page.evaluate(() => clearInterval(window.benchmarkTimer));
  if (reportPath) await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
