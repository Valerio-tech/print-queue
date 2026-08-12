const CACHE = 'print-queue-v6';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/app.css',
  './js/app.js',
  './js/storage.js',
  './js/metadata.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/sources/printables.png',
  './icons/sources/thingiverse.png',
  './icons/sources/makerworld.png',
  './icons/sources/thangs.png',
  './icons/sources/crealitycloud.png',
  './icons/sources/cults3d.svg',
  './icons/sources/myminifactory.svg',
  './icons/sources/yeggi.svg',
  './icons/sources/sketchfab.svg',
  './icons/sources/other.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetched = fetch(e.request).then((res) => {
        if (res.ok && e.request.url.startsWith(self.location.origin)) {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        }
        return res;
      });
      return cached || fetched;
    })
  );
});
