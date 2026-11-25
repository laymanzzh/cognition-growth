/* 认知成长 · 离线缓存 + 自动更新
   策略：网络优先（联网时永远拿最新版），断网回退本地缓存。
   这样每次更新推送到 Pages，手机打开即是新版本，无需清缓存。 */
const CACHE = 'cog-growth-v1';
const CORE = [
  './', './index.html', './manifest.json',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE).catch(() => null))
      .catch(() => null)
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // 外部资源（如发音音频）不接管

  event.respondWith((async () => {
    try {
      const fresh = await fetch(req, { cache: 'no-store' });
      if (fresh && fresh.ok) {
        const c = await caches.open(CACHE);
        c.put(req, fresh.clone()).catch(() => null);
      }
      return fresh;
    } catch (err) {
      const cached = await caches.match(req, { ignoreSearch: true });
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const page = await caches.match('./index.html');
        if (page) return page;
      }
      throw err;
    }
  })());
});
