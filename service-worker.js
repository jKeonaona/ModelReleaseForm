// Cache version
const CACHE = 'release-v2';

const ASSETS = [
  '/ModelReleaseForm/',
  '/ModelReleaseForm/index.html',
  '/ModelReleaseForm/styles.css',
  '/ModelReleaseForm/script.js',
  '/ModelReleaseForm/manifest.webmanifest',
  '/ModelReleaseForm/icons/icon-192.png',
  '/ModelReleaseForm/icons/icon-512.png',
  '/ModelReleaseForm/BackgroundImage.png',
  '/ModelReleaseForm/WILDPX-01-5.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match('/ModelReleaseForm/index.html'))
    );
    return;
  }
  e.respondWith(caches.match(req).then(cached => cached || fetch(req)));
});
