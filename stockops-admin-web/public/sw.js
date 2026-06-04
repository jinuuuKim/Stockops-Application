self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    if (self.registration) {
      await self.registration.unregister();
    }
    if (self.caches) {
      const cacheNames = await self.caches.keys();
      await Promise.all(cacheNames.map((cacheName) => self.caches.delete(cacheName)));
    }
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      client.navigate(client.url);
    }
  })());
});
