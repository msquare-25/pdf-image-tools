// sw.js — network-first for HTML, cache-first for static files
const VERSION = 'v1.0.0';
const STATIC_CACHE = `static-${VERSION}`;

const STATIC_ASSETS = [
  '/', '/style.css', '/site.js', '/assets/seo.js',
  '/compress', '/merge', '/pdf-to-images', '/image-to-pdf',
  '/png-to-jpg', '/jpg-to-png', '/crop', '/rotate-pages', '/reorder-pages', '/delete-pages'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== STATIC_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// HTML: network-first; others: cache-first
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('/')))
    );
    return;
  }

  event.respondWith(
    caches.match(req)
      .then(cached => cached || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(STATIC_CACHE).then(c => c.put(req, copy));
        return res;
      }))
  );
});
