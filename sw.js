/* مران اللعبة — offline cache. The game, its data and word audio are cached on install; story and grammar recordings are saved the first time they play. */
const CACHE = 'miran-game-v6';
const SHELL = ['./', 'index.html', 'game.js', 'gdata.js', 'dict.js', 'fam.js', 'wplayer.js', 'data.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  ...Array.from({ length: 11 }, (_, k) => `a/p${k}.js`)];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('miran-game') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
async function ranged(req, res) {
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || ''); const blob = await res.blob();
  const start = m && m[1] ? +m[1] : 0, end = m && m[2] ? +m[2] : blob.size - 1;
  return new Response(blob.slice(start, end + 1), { status: 206, statusText: 'Partial Content', headers: { 'Content-Type': res.headers.get('Content-Type') || 'audio/webm', 'Content-Range': `bytes ${start}-${end}/${blob.size}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
}
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.endsWith('.webm')) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE); let hit = await c.match(url.href, { ignoreSearch: true });
      if (!hit) { try { const full = await fetch(url.href); if (full.ok && full.status === 200) { await c.put(url.href, full.clone()); hit = full; } else return fetch(req); } catch (err) { return fetch(req); } }
      return req.headers.has('range') ? ranged(req, hit) : hit;
    })());
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
    if (res.ok && /\.(js|html|png|webmanifest)$|\/$/.test(url.pathname)) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
    return res;
  }).catch(() => caches.match('index.html'))));
});
