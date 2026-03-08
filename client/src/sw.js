import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

// Precache all static assets (replaced by vite-plugin-pwa at build time)
precacheAndRoute(self.__WB_MANIFEST);

// Cache API responses with network-first strategy
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({ cacheName: 'api-cache', networkTimeoutSeconds: 10 })
);

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'archivo 🗂';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: data.data || {},
    vibrate: [100, 50, 100],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click — open app at the right tracker
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const trackerId = event.notification.data?.trackerId;
  const url = trackerId ? `/trackers/${trackerId}` : '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          return client.navigate(url);
        }
      }
      return clients.openWindow(url);
    })
  );
});
