self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('bgm-cache').then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/style.css',
        '/script.js',
        '/manifest.json',
        '/assets/bgm1.mp3',
        '/assets/bgm2.mp3',
        '/assets/icon.png'
      ]);
    })
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});