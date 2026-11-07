/* Kept separate from Workbox so app updates retain the existing offline shell. */
self.addEventListener('push', event => {
  let message = {};
  try { message = event.data ? event.data.json() : {}; } catch { /* Show a gentle fallback for a malformed push too. */ }
  event.waitUntil(self.registration.showNotification(message.test ? 'Hello from Moris.' : 'A little moment with Moris?', {
    body: typeof message.body === 'string' ? message.body.slice(0, 250) : 'Mark what you did today and take a look at tomorrow. There’s room for a fresh start.',
    icon: new URL('icon-192.png', self.registration.scope).href, badge: new URL('icon-192.png', self.registration.scope).href, tag: message.test ? 'moris-test' : 'moris-evening', renotify: false,
    data: { evening: true },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = windows.find(window => window.url.startsWith(self.registration.scope));
    if (client) { client.postMessage({ type: 'OPEN_EVENING_REVIEW' }); await client.focus(); }
    else await self.clients.openWindow(new URL('?evening=1', self.registration.scope).href);
  })());
});
