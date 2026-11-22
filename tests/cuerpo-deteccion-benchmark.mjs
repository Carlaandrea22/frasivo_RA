import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const out = 'docs/renovacion/cuerpo-deteccion';
const mode = process.argv[2];
if (!mode || !/^[a-z0-9-]+$/.test(mode)) throw new Error('Usa un nombre para la medición, por ejemplo: despues.');
const directory = '.superpowers/cuerpo-deteccion';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-unsafe-swiftshader', ...(process.env.BODY_CPU_ONLY ? ['--disable-gpu'] : [])] });
const scenes = [
  { name: 'frente', file: 'pose-front', crop: [140, 65, 550, 925], light: 1 },
  { name: 'poca-luz', file: 'pose-front', crop: [140, 65, 550, 925], light: .26 },
  { name: 'sombra', file: 'pose-front', crop: [140, 65, 550, 925], light: 1, shadow: true },
  { name: 'cintura', file: 'pose-front', crop: [257, 48, 315, 440], light: 1 },
  { name: 'yoga', file: 'pose', crop: [0, 0, 1000, 667], light: 1, wide: true },
  { name: 'sentado', file: 'pose-seated', crop: [0, 0, 623, 1024], light: 1 },
  { name: 'espalda', file: 'pose-back', crop: [0, 0, 500, 753], light: 1 },
];
try {
  for (const scene of scenes.filter(scene => !process.argv[3] || scene.name === process.argv[3])) {
    const source = 'data:image/jpeg;base64,' + (await readFile('tests/fixtures/' + scene.file + '.jpg')).toString('base64');
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.addInitScript(({ source, crop, light, wide, shadow }) => {
      const frames = [];
      window.measureFrames = frames;
      const WorkerClass = window.Worker;
      window.Worker = class extends WorkerClass {
        constructor(...args) {
          super(...args);
          this.addEventListener('message', ({ data }) => {
            if (data.type !== 'pose') return;
            const t = performance.now();
            requestAnimationFrame(() => requestAnimationFrame(() => {
              frames.push({ time: t, ms: data.ms, model: data.model, delegate: data.delegate,
                points: data.points.map(({ x, y, z, visibility }) => [x,y,z,visibility].map(value => +value.toFixed(4))),
                status: document.querySelector('.anatomy-status')?.textContent,
                visible: [...document.querySelectorAll('.anatomy-sprites image[data-part]')].map(el => el.dataset.part),
                feet: Number(document.querySelector('[data-regional-feet]')?.getAttribute('data-regional-feet') ?? 0),
                reasons: JSON.parse(document.querySelector('.anatomy-debug')?.dataset.boneRejections ?? '[]'),
                support: JSON.parse(document.querySelector('.anatomy-debug')?.dataset.poseSupport ?? '[]'),
                debug: [...document.querySelectorAll('.anatomy-debug > div:not([data-detector])')].map(el => el.textContent),
              });
            }));
          });
        }
      };
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
        const photo = new Image();
        photo.src = source;
        await photo.decode();
        const canvas = document.createElement('canvas');
        canvas.width = wide ? 960 : 560;
        canvas.height = wide ? 640 : 1040;
        const ctx = canvas.getContext('2d');
        const [x,y,w,h] = crop;
        const scale = canvas.height/h;
        let frame = 0;
        const draw = () => {
          ctx.fillStyle = '#3f4b46';
          ctx.fillRect(0,0,canvas.width,canvas.height);
          ctx.filter = 'brightness(' + light + ')';
          ctx.drawImage(photo,x,y,w,h,(canvas.width-w*scale)/2 + Math.sin(frame++*.28)*.7,0,w*scale,h*scale);
          ctx.filter = 'none';
          if (shadow) {
            const gradient = ctx.createLinearGradient(0,canvas.height*.47,0,canvas.height*.74);
            gradient.addColorStop(0,'transparent');
            gradient.addColorStop(1,'rgba(12,10,7,' + (.89 + .06*Math.sin(frame*.08)) + ')');
            ctx.fillStyle = gradient;
            ctx.fillRect(0,canvas.height*.47,canvas.width,canvas.height*.53);
          }
        };
        draw();
        const stream = canvas.captureStream(24);
        const timer = setInterval(draw,40);
        const track = stream.getVideoTracks()[0];
        const stop = track.stop.bind(track);
        track.stop = () => { clearInterval(timer); stop(); };
        return stream;
      } });
    }, { source, ...scene });
    await page.goto('http://127.0.0.1:4177/?debug=1#cuerpo');
    await page.getByRole('button', { name: 'Activar cámara', exact: true }).click();
    const guide = page.getByRole('dialog', { name: 'Guía de cámara' });
    if (await guide.isVisible()) await guide.getByRole('button', { name: 'Entendido' }).click();
    await page.getByRole('button', { name: 'Minimizar controles' }).click();
    await page.waitForFunction(() => window.measureFrames.length >= 5, undefined, { timeout: 30000 });
    await page.waitForTimeout(['frente', 'poca-luz', 'sombra'].includes(scene.name) ? 12500 : 4500);
    const data = await page.evaluate(() => {
      const video = document.querySelector('video');
      const { width, height } = document.querySelector('.anatomy-landmarks').getBoundingClientRect();
      return { viewportAspect: width/height, aspect: video.videoWidth/video.videoHeight, frames: window.measureFrames };
    });
    const required = ['skull','ribs_left','ribs_right','spine','pelvis_left','pelvis_right',
      ...['humerus','radius','ulna','femur','tibia','fibula'].flatMap(bone => ['left','right'].map(side => bone+'_'+side))];
    const settled = data.frames.slice(5);
    const full = settled.filter(f => required.every(id => f.visible.includes(id))
      && f.visible.filter(id => id.startsWith('foot_phalanges_')).length + f.feet === 2);
    const example = settled.find(f => f.status === (scene.name === 'cintura' ? 'Torso' : 'Cuerpo completo'));
    console.log(scene.name, JSON.stringify({ n: settled.length,  complete: full.length,
      fps: (settled.length - 1)*1000/(settled.at(-1).time-settled[0].time),
      statuses: [...new Set(settled.map(f => f.status))], models: [...new Set(settled.map(f => [f.model,f.delegate].join('/')))],
      averageMs: settled.reduce((sum, frame) => sum+frame.ms, 0)/settled.length,
      example: example && { reasons: example.reasons, debug: example.debug } }));
    await writeFile(directory + '/' + mode + '-' + scene.name + '.json', JSON.stringify(data));
    if (!process.env.BODY_CPU_ONLY && ['frente','poca-luz','sombra','cintura'].includes(scene.name)) {
      await page.screenshot({ path: out + '/' + mode + '-' + scene.name + '-375.png' });
    }
    await page.close();
  }
} finally { await browser.close(); }
