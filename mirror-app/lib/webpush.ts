/**
 * Utility to send Web Push notifications.
 * Install: npm install web-push @types/web-push
 * Generate VAPID keys: npx web-push generate-vapid-keys
 * Add to env: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL
 */

export interface PushPayload {
  title: string
  body: string
  url?: string
}

export async function sendPushNotification(
  subscriptionJson: string,
  payload: PushPayload
): Promise<void> {
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  const vapidEmail = process.env.VAPID_EMAIL ?? 'mailto:admin@example.com'

  if (!vapidPublic || !vapidPrivate) {
    console.log('[Push] VAPID keys not configured. Skipping:', payload.title)
    return
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const webpush = require('web-push')
    webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate)
    const subscription = JSON.parse(subscriptionJson)
    await webpush.sendNotification(subscription, JSON.stringify(payload))
  } catch (err) {
    console.error('[Push] Failed to send notification:', err)
  }
}

