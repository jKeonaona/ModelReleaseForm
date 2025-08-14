// Force a new SW install
const CACHE = 'release-nuke-3';

// What to pre-cache (keep it simple)
const ASSETS = [
  '/ModelReleaseForm/',
  '/ModelReleaseForm/index.html',
  '/ModelReleaseForm/styles.css',
  '/ModelReleaseForm/script.js',
  '/ModelReleaseForm/manifest.webmanifest',
  '/ModelReleaseForm/WILDPX-01-5.png?v=7',
  '/ModelReleaseForm/icons/icon-192.png',
  '/ModelReleaseForm/icons/icon-512.png',
  '/ModelReleaseForm/BackgroundImage.png'
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

// NETWORK-FIRST for everything (get fresh files), fallback to cache offline
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        // refresh cache in background
        caches.open(CACHE).then(c => c.put(e.request, resp.clone())).catch(() => {});
        return resp;
      })
      .catch(() =>
        caches.match(e.request).then(m => m || (
          e.request.mode === 'navigate'
            ? caches.match('/ModelReleaseForm/index.html')
            : undefined
        ))
      )
  );
});



