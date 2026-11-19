const cacheName = 'ruangjeda-v0.1.2';
const files = ['./', './index.html', './style.css', './model.js', './app.js', './app.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(files)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys
    .filter((key) => key.startsWith('ruangjeda-') && key !== cacheName)
    .map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('./index.html')));
    return;
  }
  const knownFiles = files.map((path) => new URL(path, self.registration.scope).href);
  if (knownFiles.includes(event.request.url)) {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request);
        if (response.ok && !response.redirected) {
          const cache = await caches.open(cacheName);
          await cache.put(event.request, response.clone()).catch(() => {});
        }
        return response;
      } catch {
        return caches.match(event.request);
      }
    })());
  }
});
