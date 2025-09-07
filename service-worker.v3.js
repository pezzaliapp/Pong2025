// SW v3 — cache bust + autoupdate
const CACHE = 'pong2025-v3';
const ASSETS = [
  './index.html?v=3',
  './app.v3.js',
  './manifest.json?v=3',
  './icon-192.png?v=3',
  './icon-512.png?v=3',
  './icon-maskable-192.png?v=3',
  './icon-maskable-512.png?v=3',
  './apple-touch-icon-180.png?v=3'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k===CACHE?null:caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // prefer network (so updates arrive) with cache fallback
  e.respondWith(fetch(e.request).then(res => {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy));
    return res;
  }).catch(()=> caches.match(e.request).then(r=> r || caches.match('./index.html?v=3'))));
});
