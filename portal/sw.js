/* Portal service worker. It never stores project data or pages: everything comes fresh from the server.
   It only shows a friendly page if the phone is offline. */
const OFFLINE = '/portal/app/offline.html';
self.addEventListener('install', (e) => { e.waitUntil(caches.open('sr-portal-v1').then((c) => c.addAll([OFFLINE, '/portal/app/icon-192.png']))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return; // let the browser handle everything else normally
  e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)));
});
