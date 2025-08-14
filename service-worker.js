// Cache version (bump this when you change files)
const CACHE = 'release-v1';

// List of files to cache
const ASSETS = [
  '/ModelReleaseForm/',
  '/ModelReleaseForm/index.html',
  '/ModelReleaseForm/styles.css',
  '/ModelReleaseForm/script.js',
  '/ModelReleaseForm/manifest.webmanifest',
  '/ModelReleaseForm/icons/icon-192.png',
  '/ModelReleaseForm/icons/icon-512.png',
  '/ModelReleaseForm/backgroundImage.png',
  '/ModelReleaseForm/WILDPX-01-5.png'
  // Add any other image, font, or file your form uses
];

// Install event: cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch event: serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // HTML navigation requests: try network first, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/ModelReleaseForm/index.html'))
    );
    return;
  }

  // Other requests: try cache first, then network
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});
