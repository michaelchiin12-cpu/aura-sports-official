/* AURA Sport Manager — service worker.
   Prinsip: SELALU ambil versi terbaru dari jaringan (network-first) supaya update Vercel langsung terpakai.
   Cache hanya dipakai sebagai cadangan bila HP offline. Supabase / CDN / API tidak pernah disentuh. */
const CACHE = 'aura-shell-v1';
const SHELL = ['/', '/index.html', '/mobile-responsive.css', '/mobile-responsive.js', '/story-mvp.js', '/logo-favicon.png', '/icons/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // Supabase, CDN, dll: langsung ke jaringan
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('/index.html') : undefined)))
  );
});
