var CACHE = 'wanxiang-202611031200-vp1023-gxu1020-gx1103-co1-xz1103';
/* 預先快取小智套件 xz2.js（離線也能用回答對象／長度／讀者資料） */
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(['./xz2.js'].map(function (u) { return fetch(new Request(u, { cache: 'reload' })).then(function (r) { if (r && r.ok) { return c.put(u, r); } })['catch'](function () {}); }));
  }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
/* 有網路時一律向網站要最新版（不用瀏覽器的舊快取）；沒網路時才用手機裡存的那一份 */
self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) { return; }
  e.respondWith(fetch(r, { cache: 'no-cache' }).then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(r, copy); }); }
    return res;
  }).catch(function () { return caches.match(r, { ignoreSearch: true }); }));
});
