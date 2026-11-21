import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
async function walk(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) result.push(...await walk(path));
    else if (entry.name !== 'sw.js') result.push(path);
  }
  return result;
}
const files = await walk('dist');
const hash = createHash('sha256');
hash.update(await readFile(new URL(import.meta.url)));
for (const file of files.sort()) hash.update(await readFile(file));
const cacheName = `frasivo-explore-${hash.digest('hex').slice(0, 12)}`;
const urls = ['/', ...files.map(file => file.slice(4))];
await writeFile('dist/sw.js', `// Generated from the exact build, including model, WASM and fonts.
const NAME = ${JSON.stringify(cacheName)};
const FILES = ${JSON.stringify(urls)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(NAME).then(cache => cache.addAll(FILES)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('frasivo-explore-') && k !== NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(caches.open(NAME).then(async cache => {
    // Only this build's public static files are stored here. Ignore Vary:
    // Origin because module/style requests add Origin but precache does not.
    const cached = await cache.match(request, { ignoreVary: true });
    if (cached) return cached;
    try { return await fetch(request); }
    catch (error) {
      if (request.mode === 'navigate') return (await cache.match('/index.html')) || Response.error();
      throw error;
    }
  }));
});
`);
console.log(`PWA: ${urls.length} recursos preparados, incluyendo modelo y voces no incluidas (dependen del sistema). Caché: ${cacheName}`);
