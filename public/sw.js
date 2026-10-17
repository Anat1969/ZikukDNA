// Pages come from the network (fresh deploys), static assets and images from cache.
const CACHE = 'zikuk-dna-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/favicon.svg', '/icons/icon-192.png']))); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/')));
    return;
  }
  const isAsset = url.origin === location.origin && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/'));
  const isImage = req.destination === 'image' || /\/storage\/v1\/object\/public\//.test(url.pathname);
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!isAsset && !isImage && !isFont) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok || res.type === 'opaque') c.put(req, res.clone());
    return res;
  }));
});
