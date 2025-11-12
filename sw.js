/* sw.js — PDF Image Lab
   - Network-first for HTML (so users see fresh pages)
   - Cache-first for static assets (CSS/JS/images) with versioned cache
   - Bypass Google Ads/Analytics so ads work normally
   - Only handles same-origin GET requests
*/
const VERSION = 'v1.1.0';
const STATIC_CACHE = `static-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;

// ❗Domains we must NOT intercept (ads/analytics/etc.)
const BYPASS_SW = [
  'googlesyndication.com',
  'googleads.g.doubleclick.net',
  'doubleclick.net',
  'googletagservices.com',
  'googletagmanager.com',
  'google-analytics.com',
  'g.doubleclick.net',
  'fundingchoicesmessages.google.com'
];

// Precache these routes & core assets (clean URLs expected)
const STATIC_ASSETS = [
  '/', '/style.css', '/site.js', '/assets/seo.js',
  '/compress', '/merge', '/pdf-to-images', '/image-to-pdf',
  '/png-to-jpg', '/jpg-to-png', '/crop', '/rotate-pages',
  '/reorder-pages', '/delete-pages'
];

// Helper: same-origin check
function isSameOrigin(url) {
  try {
    const u = new URL(url);
    return u.origin === self.location.origin;
  } catch {
    return false;
  }
}

// Helper: should we bypass (ads/analytics)?
function shouldBypass(url) {
  try {
    const u = new URL(url);
    return BYPASS_SW.some((d) => u.hostname === d || u.hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

// Helper: is it a static asset?
const STATIC_EXT_RE = /\.(css|js|mjs|png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Optional: allow page to tell SW to update immediately
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET
  if (req.method !== 'GET') return;

  const url = req.url;

  // 1) Never intercept ad/analytics requests
  if (shouldBypass(url)) return;

  // 2) Only handle same-origin requests
  if (!isSameOrigin(url)) return;

  // Identify HTML navigations
  const isHTML =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  // Strategy: HTML → network-first
  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match('/'))
        )
    );
    return;
  }

  // Strategy: static assets → cache-first
  if (STATIC_EXT_RE.test(new URL(url).pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          // opaque responses (e.g., cross-origin fonts) shouldn't happen due to same-origin check,
          // but we still guard:
          if (!res || res.status !== 200 || res.type === 'opaque') return res;
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
          return res;
        });
      })
    );
    return;
  }

  // Strategy: other same-origin GET → stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
      return cached ? Promise.resolve(cached).then(() => fetchPromise) : fetchPromise;
    })
  );
});
