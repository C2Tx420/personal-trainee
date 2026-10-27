/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

/**
 * Service worker: chỉ precache file tĩnh (JS/CSS/icon) để mở nhanh + phát hiện
 * bản mới, và nhận Web Push. KHÔNG cache dữ liệu Supabase (/rest, /auth, /storage
 * ở domain khác nên không bao giờ đi qua precache).
 */
declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: (string | { url: string; revision: string | null })[] };

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
// SPA: mọi điều hướng trả về index.html đã precache → mất mạng vẫn hiện được màn "Cần kết nối mạng"
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

self.addEventListener('push', (event) => {
  const data = (() => {
    try {
      return event.data?.json() as { title?: string; body?: string; tag?: string; url?: string };
    } catch {
      return { title: 'Tập luyện', body: event.data?.text() };
    }
  })();
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Tập luyện', {
      body: data.body,
      tag: data.tag,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url ?? '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => 'focus' in c);
      if (existing) return (existing as WindowClient).focus();
      return self.clients.openWindow(url);
    }),
  );
});
