// /ModelReleaseForm/service-worker.js
const CACHE = 'release-v1'; // bump this when you change files

const ASSETS = [
  '/ModelReleaseForm/',
  '/ModelReleaseForm/index.html',
  '/ModelReleaseForm/styles.css',
  '/ModelReleaseForm/script.js',
  '/ModelReleaseForm/manifest.webmanifest',
  '/ModelReleaseForm/WILDPX-01-5.png',
  '/ModelReleaseForm/backgroundImage.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;

  // For navigations (HTML pages), try network first, then cache, then fallback to index
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(async () =>
        (await caches.match(req)) || caches.match('/ModelReleaseForm/index.html')
      )
    );
    return;
  }

  // For everything else, cache-first, fall back to network
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});
