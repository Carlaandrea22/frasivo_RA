import { cp, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';

async function walk(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) result.push(...await walk(path));
    else if (entry.name !== 'sw.js') result.push(path);
  }
  return result;
}

// Vite does not copy public/ wholesale, so stale detector assets stay out.
const publicFiles = [
  'manifest.webmanifest', 'favicon.ico', 'apple-touch-icon.png',
  'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable.png', 'body-tracking',
];
for (const file of publicFiles) {
  await cp(`public/${file}`, `dist/${file}`, { recursive: true });
}

const tracking = {
  full: ['/body-tracking/pose_landmarker_full.task', 'pose-landmarker-full-v1'],
  hand: ['/body-tracking/hand_landmarker.task', 'body-hand-landmarker-v1'],
  face: ['/body-tracking/face_landmarker.task', 'body-face-landmarker-v1'],
};
const simd = '/body-tracking/wasm/vision_wasm_internal.wasm';
// A .gz extension can make static hosts decode the payload as HTTP Content-Encoding.
const packedSimd = `${simd}.bin`;
const nosimd = [
  '/body-tracking/wasm/vision_wasm_nosimd_internal.js',
  '/body-tracking/wasm/vision_wasm_nosimd_internal.wasm',
];
await writeFile(`dist${packedSimd}`, gzipSync(await readFile(`dist${simd}`)));

const files = (await walk('dist')).sort();
const urls = files.map(file => file.slice(4));
for (const required of ['/body-tracking/pose_landmarker_lite.task', ...Object.values(tracking).map(([url]) => url)]) {
  if (!urls.includes(required)) throw new Error(`Falta ${required}. Ejecuta npm run assets antes de compilar.`);
}

const { parts } = JSON.parse(await readFile('assets/anatomy/body/anchors.json', 'utf8'));
const spriteLayers = new Map();
for (const { id, layer, demoSprite, backSprite } of parts) {
  spriteLayers.set(id, layer);
  if (demoSprite) spriteLayers.set(`${id}_front`, layer);
  if (backSprite) spriteLayers.set(`${id}_back`, layer);
}

const geometryLayers = {
  bones: new Set(['bones', 'hand', 'head', 'foot']),
  muscles: new Set(['muscles', 'hand-muscles', 'head-muscles']),
  organs: new Set(['organs', 'head-organs', 'heart-cutaway']),
};
const layers = { muscles: [], organs: [] };
for (const url of urls) {
  const asset = /^\/assets\/(.+)-[\w-]{8}\.(glb|webp)$/.exec(url);
  if (!asset) continue;
  const [, name, format] = asset;
  const layer = format === 'webp' ? spriteLayers.get(name) :
    Object.keys(geometryLayers).find(key => geometryLayers[key].has(name));
  if (format === 'glb' && !layer) throw new Error(`No se asignó una capa a ${url}.`);
  if (layer === 'muscles' || layer === 'organs') layers[layer].push(url);
}

const optional = new Set([simd, ...nosimd, ...Object.values(tracking).map(([url]) => url), ...Object.values(layers).flat()]);
const shell = ['/', ...urls.filter(url => !optional.has(url))];
const bytes = (await Promise.all(shell.map(url => stat(`dist${url === '/' ? '/index.html' : url}`))))
  .reduce((total, info) => total + info.size, 0);
if (bytes > 20_000_000) throw new Error(`La precaché de LumAR supera 20 MB (${bytes} bytes).`);

const runtime = await readFile(new URL('./sw-runtime.js', import.meta.url), 'utf8');
const config = { shell, layers, simd, packedSimd, nosimd, tracking };
const hash = createHash('sha256');
hash.update(runtime).update(JSON.stringify(config));
for (const file of files) hash.update(await readFile(file));
const cacheName = `lumar-shell-${hash.digest('hex').slice(0, 12)}`;
await writeFile('dist/sw.js', `// Generated from the exact build.
const NAME = ${JSON.stringify(cacheName)};
const CONFIG = ${JSON.stringify(config)};
${runtime}`);
console.log(`PWA: ${shell.length} recursos precargados, ${bytes.toLocaleString('es')} bytes. Caché: ${cacheName}`);
