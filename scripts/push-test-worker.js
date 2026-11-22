self.addEventListener('push', event => {
  if (!event.data) return;
  try {
    if (event.data.json()?.type !== 'lumar-push-test') return;
  } catch {
    return;
  }
  event.waitUntil(self.registration.showNotification('LumAR · Prueba de notificación', {
    body: '¡Funcionó! Este aviso fue programado para llegar aunque cierres LumAR.',
    icon: '/icon-192.png',
    tag: 'lumar-push-test',
  }));
});

self.addEventListener('notificationclick', event => {
  if (event.notification.tag !== 'lumar-push-test') return;
  event.notification.close();
  const target = new URL('/#progreso/notificaciones', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const app = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (app) {
      try {
        const moved = await app.navigate(target);
        if (moved) return moved.focus();
      } catch {
        // Open the test view if the previous window no longer exists.
      }
    }
    return self.clients.openWindow(target);
  })());
});
