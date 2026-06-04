// Mirror service worker — handles Web Push notifications

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Mirror', body: event.data.text() }
  }

  const options = {
    body: payload.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: { url: payload.url ?? '/' },
    requireInteraction: false,
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'Mirror', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const focused = clients.find((c) => c.url === url && 'focus' in c)
      if (focused) return focused.focus()
      return self.clients.openWindow(url)
    })
  )
})
