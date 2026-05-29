/**
 * sw.js — Service Worker v3.0.0
 * 臺北市政府工務局鼠類防治稽查報告 PWA
 * 快取策略：Stale-While-Revalidate
 */
const CACHE_VER = 'v3.0.0';
const CACHE     = `rat-insp-${CACHE_VER}`;
const PRECACHE  = [
  './', './index.html', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.allSettled(PRECACHE.map(u => c.add(u).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(
        ks.filter(k => k.startsWith('rat-insp-') && k !== CACHE)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request: req } = e;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('googleapis.com')) return;
  if (!url.protocol.startsWith('http')) return;
  e.respondWith(swr(req));
});

async function swr(req) {
  const cache  = await caches.open(CACHE);
  const cached = await cache.match(req);
  const net    = fetch(req.clone())
    .then(r => { if (r?.status === 200) cache.put(req, r.clone()); return r; })
    .catch(() => {});
  return cached ?? await net ??
    new Response('<h2 style="font-family:sans-serif;text-align:center;padding:3rem">離線中，請確認網路後重試。</h2>',
      { headers: { 'Content-Type': 'text/html;charset=utf-8' } });
}

self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
