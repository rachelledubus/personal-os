// Minimal service worker. Two jobs only:
// 1. Existing = installable as a PWA (a service worker registration is
//    one of the browser's install criteria, alongside the manifest).
// 2. Receive and display push notifications, and handle taps on them.
//
// Deliberately NOT doing full offline asset caching — that's a
// separate, bigger scope (cache versioning, invalidation on deploy)
// that isn't needed just to unlock installability + push.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Reminder', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Reminder', {
      body: payload.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: payload.tag || 'reminder',
      data: { url: payload.url || '/today' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/today';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
