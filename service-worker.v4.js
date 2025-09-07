// SW v4 — cache bust, network-first
const CACHE = 'pong2025-v4';
const ASSETS = [
  './index.html?v=4',
  './app.v4.js',
  './manifest.json?v=4',
  './icon-192.png?v=4',
  './icon-512.png?v=4',
  './icon-maskable-192.png?v=4',
  './icon-maskable-512.png?v=4',
  './apple-touch-icon-180.png?v=4'
];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k===CACHE?null:caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request).then(res => { const copy=res.clone(); caches.open(CACHE).then(c=>c.put(e.request, copy)); return res; })
    .catch(()=> caches.match(e.request).then(r=> r || caches.match('./index.html?v=4'))));
});
