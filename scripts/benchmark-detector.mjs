import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

// Local-only benchmark. The supplied image is never sent to a remote service.
const [imagePath, outputPath, cropMode = 'full', model = 'lite0'] = process.argv.slice(2);
if (!imagePath) throw new Error('Usage: node scripts/benchmark-detector.mjs IMAGE [REPORT.json]');
const uri = 'data:image/png;base64,' + (await readFile(imagePath)).toString('base64');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  const bundle = (await readFile('public/detector.worker.js', 'utf8')).replaceAll('efficientdet-lite0.tflite', model === 'lite2' ? 'efficientdet-lite2.tflite' : 'efficientdet-lite0.tflite');
  await page.route('**/benchmark-worker.js', route => route.fulfill({ contentType: 'text/javascript', body: bundle }));
  await page.goto('http://127.0.0.1:4173');
  const report = await page.evaluate(async ({ uri, cropMode }) => {
    const image = new Image(); image.src = uri; await image.decode();
    const worker = new Worker('/benchmark-worker.js');
    const times = [];
    const samples = [];
    let start = 0;
    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { worker.terminate(); reject(new Error('Benchmark timeout')); }, 60000);
      const send = async () => {
        // Region of the user-provided screenshot occupied by the camera preview.
        const side = Math.round(711 * .8);
        const region = cropMode === 'focus' ? [291 + Math.round((951-side)/2), 151 + Math.round((711-side)/2), side, side] : [291, 151, 951, 711];
        const frame = await createImageBitmap(image, ...region);
        start = performance.now();
        worker.postMessage({ type: 'frame', frame, timestamp: start }, [frame]);
      };
      worker.onerror = e => { clearTimeout(timeout); worker.terminate(); reject(new Error(e.message)); };
      worker.onmessage = async ({ data }) => {
        if (data.type === 'ready') await send();
        else if (data.type === 'results') {
          times.push(performance.now() - start);
          samples.push(data.detections.map(d => ({ label: d.label, score: d.score })));
          if (times.length < 12) await send();
          else {
            clearTimeout(timeout); worker.terminate();
            const measured = times.slice(2).sort((a,b) => a-b);
            resolve({ source: 'Local crop of the supplied screenshot; repeated still frames, not live-camera accuracy.', cropMode, warmupFrames: 2, measuredFrames: measured.length, medianRoundTripMs: measured[Math.floor(measured.length/2)], p90RoundTripMs: measured[Math.floor(measured.length*.9)], samples: samples.slice(2) });
          }
        } else if (data.type === 'error') { clearTimeout(timeout); worker.terminate(); reject(new Error(data.message)); }
      };
      worker.postMessage({ type: 'init' });
    });
  }, { uri, cropMode });
  const json = JSON.stringify({ model, ...report }, null, 2);
  if (outputPath) await writeFile(outputPath, json + '\n');
  console.log(json);
} finally { await browser.close(); }
