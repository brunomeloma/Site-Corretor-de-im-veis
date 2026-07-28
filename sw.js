/* Service Worker do BARBER PRO.
   Serve para duas coisas: receber as notificações push (mesmo com o app
   fechado) e abrir a agenda quando o barbeiro tocar no aviso. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (evento) => {
  let dados = { titulo: 'BARBER PRO', corpo: 'Você tem um atendimento chegando.', url: '/app.html#agenda' };
  try { dados = { ...dados, ...(evento.data ? evento.data.json() : {}) }; } catch { /* texto simples */ }

  evento.waitUntil(self.registration.showNotification(dados.titulo, {
    body: dados.corpo,
    icon: '/assets/img/icone.svg',
    badge: '/assets/img/icone.svg',
    tag: dados.tag || 'lembrete',
    renotify: true,
    vibrate: [120, 60, 120],
    data: { url: dados.url }
  }));
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const destino = evento.notification.data?.url || '/app.html#agenda';
  evento.waitUntil((async () => {
    const abas = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const aba of abas) {
      if (aba.url.includes('/app.html')) { await aba.focus(); return aba.navigate(destino); }
    }
    return clients.openWindow(destino);
  })());
});
