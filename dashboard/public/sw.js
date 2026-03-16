const CACHE_NAME = 'clarita-v1';
const STATIC_ASSETS = ['/', '/login', '/patient-home'];

// Install: cache main pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network first, cache fallback
self.addEventListener('fetch', (event) => {
  // Don't intercept API calls
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'CLARITA', {
      body: data.body || 'Você tem uma notificação.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'clarita',
      data: { url: data.url || '/patient-home' },
    })
  );
});

// Notification click → open app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      const url = event.notification.data?.url || '/patient-home';
      const existing = clientList.find(c => c.url.includes(url));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
