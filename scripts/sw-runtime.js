const DOWNLOADS = 'lumar-downloads-v1';
const deferred = new Set([CONFIG.simd, ...CONFIG.nosimd, ...Object.values(CONFIG.layers).flat(), ...CONFIG.exploreOnDemand]);
const pending = new Map();

self.addEventListener('install', event => {
  event.waitUntil(caches.open(NAME).then(cache =>
    cache.addAll(CONFIG.shell.map(path => new Request(path, { cache: 'reload' }))),
  ));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const previous = (await caches.keys()).filter(key => key !== NAME &&
      (/^lumar-(?:shell-)?[\da-f]{12}$/.test(key) || key.startsWith('frasivo-explore-')));
    // Builds before deferred downloads kept the atlas and fallback WASM with the shell.
    const downloads = await caches.open(DOWNLOADS);
    const migratable = [...CONFIG.nosimd, ...Object.values(CONFIG.layers).flat(), ...CONFIG.exploreOnDemand];
    if (typeof DecompressionStream !== 'function') migratable.push(CONFIG.simd);
    for (const key of previous) {
      const oldShell = await caches.open(key);
      const copied = await Promise.allSettled(migratable.map(async path => {
        if (await downloads.match(path, { ignoreVary: true })) return;
        const response = await oldShell.match(path, { ignoreVary: true });
        if (response) await downloads.put(path, response);
      }));
      if (copied.every(result => result.status === 'fulfilled')) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

async function audioRange(response, range) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2])) return response;
  const audio = await response.blob();
  const [, first, last] = match;
  const start = first ? Number(first) : Math.max(0, audio.size - Number(last));
  const end = first && last ? Math.min(audio.size - 1, Number(last)) : audio.size - 1;
  if (start > end) return new Response(null, {
    status: 416, headers: { 'Content-Range': `bytes */${audio.size}` },
  });
  const headers = new Headers(response.headers);
  headers.delete('Content-Encoding');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Range', `bytes ${start}-${end}/${audio.size}`);
  headers.set('Content-Length', String(end - start + 1));
  return new Response(audio.slice(start, end + 1), { status: 206, headers });
}

function withoutRedirect(response) {
  if (!response.redirected) return response;
  return new Response(response.body, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
}

function download(path) {
  if (!pending.has(path)) {
    const result = (async () => {
      const cache = await caches.open(DOWNLOADS);
      const cached = await cache.match(path, { ignoreVary: true });
      if (cached) return cached;
      const response = await fetch(path);
      // A missing static asset can fall through to the server's HTML shell.
      if (response.ok && response.status !== 206 && !response.headers.get('Content-Type')?.includes('text/html')) {
        try { await cache.put(path, response.clone()); }
        catch { /* The online response is still usable when storage is full. */ }
      }
      return response;
    })().finally(() => { pending.delete(path); });
    pending.set(path, result);
  }
  return pending.get(path);
}

async function respond(request, url) {
  const range = request.headers.get('range');
  if (range && !url.pathname.endsWith('.mp3')) return fetch(request);
  const shell = await caches.open(NAME);
  // Requests for scripts/styles may add Origin while precache requests do not.
  const cached = await shell.match(request, { ignoreVary: true, ignoreSearch: request.mode === 'navigate' });
  if (cached) {
    const response = withoutRedirect(cached);
    return range ? audioRange(response, range) : response;
  }
  if (url.pathname === CONFIG.simd && typeof DecompressionStream === 'function') {
    const compressed = await shell.match(CONFIG.packedSimd);
    if (compressed?.body) {
      const binary = compressed.body.pipeThrough(new DecompressionStream('gzip'));
      return new Response(binary, { headers: { 'Content-Type': 'application/wasm' } });
    }
  }
  if (deferred.has(url.pathname)) return withoutRedirect((await download(url.pathname)).clone());
  try {
    return await fetch(request);
  } catch (error) {
    if (request.mode === 'navigate') {
      const home = await shell.match('/');
      return home ? withoutRedirect(home) : Response.error();
    }
    throw error;
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method === 'GET' && url.origin === self.location.origin && !url.pathname.startsWith('/api/')) {
    event.respondWith(respond(request, url));
  }
});

async function allCached(name, paths) {
  const matches = await Promise.all(paths.map(path => caches.match(path, { cacheName: name, ignoreVary: true })));
  return matches.every(Boolean);
}

async function offlineStatus() {
  // Feature probe for the SIMD instructions MediaPipe uses to choose its binary.
  const simd = typeof WebAssembly !== 'undefined' && WebAssembly.validate(new Uint8Array([
    0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11,
  ]));
  const compatibility = simd ? (typeof DecompressionStream === 'function' ? [] : [CONFIG.simd]) : CONFIG.nosimd;
  const entries = [
    ['base', allCached(NAME, CONFIG.shell)],
    ['camera', allCached(DOWNLOADS, compatibility)],
    ...Object.entries(CONFIG.layers).map(([key, urls]) => [key, allCached(DOWNLOADS, urls)]),
    ...Object.entries(CONFIG.tracking).map(([key, [url, cacheName]]) => [key, allCached(cacheName, [url])]),
  ];
  return Object.fromEntries(await Promise.all(entries.map(async ([key, status]) => [key, await status])));
}

self.addEventListener('message', event => {
  if (event.data?.type === 'LUMAR_ACTIVATE_UPDATE') {
    event.waitUntil(self.skipWaiting());
  } else if (event.data?.type === 'LUMAR_OFFLINE_STATUS') {
    event.waitUntil(offlineStatus().then(status => event.ports[0]?.postMessage(status)));
  } else if (event.data?.type === 'LUMAR_WARM_LAYER') {
    const layer = event.data.layer;
    if (layer !== 'muscles' && layer !== 'organs') return;
    event.waitUntil((async () => {
      await Promise.allSettled(CONFIG.layers[layer].map(download));
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) client.postMessage({ type: 'LUMAR_OFFLINE_CHANGED' });
    })());
  }
});
