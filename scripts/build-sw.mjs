import { cp, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const pushTest = process.argv.includes('--push-test');
const output = pushTest ? 'dist-push-test' : 'dist';
const pushWorker = pushTest ? await readFile(new URL('./push-test-worker.js', import.meta.url), 'utf8') : '';

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
const publicFiles = ['manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable.png', 'body-tracking'];
for (const file of publicFiles) {
  await cp(`public/${file}`, `${output}/${file}`, { recursive: true });
}
if (pushTest) {
  const manifestPath = `${output}/manifest.webmanifest`;
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.name = 'LumAR · Prueba de notificaciones';
  manifest.short_name = 'LumAR Push';
  manifest.start_url = '/#progreso/notificaciones';
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}
const files = await walk(output);
const hash = createHash('sha256');
hash.update(await readFile(new URL(import.meta.url)));
hash.update(pushWorker);
for (const file of files.sort()) hash.update(await readFile(file));
const cacheName = `lumar-${hash.digest('hex').slice(0, 12)}`;
// MediaPipe selects this pair only when its SIMD capability check fails.
const runtimeOnly = new Set([
  '/body-tracking/wasm/vision_wasm_nosimd_internal.js',
  '/body-tracking/wasm/vision_wasm_nosimd_internal.wasm',
]);
const urls = ['/', ...files.map(file => file.slice(output.length)).filter(url => !runtimeOnly.has(url))];
await writeFile(`${output}/sw.js`, `// Generated from the exact build.
const NAME = ${JSON.stringify(cacheName)};
const FILES = ${JSON.stringify(urls)};
const RUNTIME_ONLY = new Set(${JSON.stringify([...runtimeOnly])});
self.addEventListener('install', event => {
  event.waitUntil(caches.open(NAME).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => (k.startsWith('lumar-') || k.startsWith('frasivo-explore-')) && k !== NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  event.respondWith(caches.open(NAME).then(async cache => {
    // Only this build's public static files are stored here. Ignore Vary:
    // Origin because module/style requests add Origin but precache does not.
    const cached = await cache.match(request, { ignoreVary: true });
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (RUNTIME_ONLY.has(url.pathname) && response.ok && response.status !== 206) {
        try { await cache.put(request, response.clone()); }
        catch { /* If storage is full, the online response still works. */ }
      }
      return response;
    }
    catch (error) {
      if (request.mode === 'navigate') return (await cache.match('/index.html')) || Response.error();
      throw error;
    }
  }));
});
${pushWorker}
`);
console.log(`PWA: ${urls.length} recursos precargados, con Pose Lite y WASM SIMD. Variante sin SIMD bajo demanda. Caché: ${cacheName}`);
