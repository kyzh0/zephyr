import type { AlertRule } from '@/models/notification.model';

const API_BASE = import.meta.env.VITE_API_PREFIX as string;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function subscribePush(
  rules: AlertRule[],
  unit: 'kmh' | 'kt'
): Promise<PushSubscription> {
  const registration = await navigator.serviceWorker.ready;
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource
  });

  await syncSubscription(subscription, rules, unit);
  return subscription;
}

export async function syncSubscription(
  subscription: PushSubscription,
  rules: AlertRule[],
  unit: 'kmh' | 'kt'
): Promise<void> {
  const json = subscription.toJSON();
  if (!json.keys) throw new Error('Subscription missing keys');

  const response = await fetch(`${API_BASE}/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: { auth: json.keys.auth, p256dh: json.keys.p256dh },
      rules: rules.map((r) => ({
        id: r.id,
        stationId: r.stationId,
        threshold: r.threshold,
        boundType: r.boundType,
        directions: r.directions
      })),
      unit
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to sync subscription: ${response.status}`);
  }
}
