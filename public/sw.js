// SMC CRM — Service Worker
// This file intentionally unregisters itself and any previous service workers.
// The Compaction/write-batch errors in browser DevTools are caused by stale
// PWA service workers; this sw.js cleans them up on first load.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clear all caches from any previous PWA install
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      // Take control of all open clients immediately
      await self.clients.claim();
    })()
  );
});

// No fetch handler — this SW passes everything through
