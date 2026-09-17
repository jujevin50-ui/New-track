/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
// @ts-expect-error injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST || []);


// ─── Push notification handler ─────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: { title?: string; body?: string; url?: string } = {};
  try { payload = event.data.json(); } catch { payload.body = event.data.text(); }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? '📊 Trading Journal', {
      body: payload.body ?? '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      data: payload.url ?? '/productivity',
      vibrate: [150, 50, 150],
      requireInteraction: false,
    })
  );
});

// ─── Notification click: open app ─────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = typeof event.notification.data === 'string'
    ? event.notification.data
    : '/productivity';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((list) => {
        const match = list.find((c) => c.url === url);
        return match ? match.focus() : self.clients.openWindow(url);
      })
  );
});
