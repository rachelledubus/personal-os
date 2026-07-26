import { supabase } from '../lib/supabaseClient.js';

// VAPID public key — safe to hardcode, it's meant to be public (the
// private key, which actually authorizes sending, lives only in the
// Netlify function environment, never shipped to the client).
export const VAPID_PUBLIC_KEY = 'BIX5SkB_zGTsRXTl1QHH63IMxaUrzTjlt3rRGdJLA8co3hIRyDtKFcyYHq2Duj_YGKPatYIgXD0JLNWLeBJ6E2E';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function notificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

/** Requests permission (if needed) and creates a real push subscription,
 *  storing it in Supabase. Call from a real user gesture (a button
 *  click) — browsers reject silent/automatic permission requests. */
export async function subscribeToPush() {
  if (!pushSupported()) throw new Error('Push notifications aren\u2019t supported in this browser.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was not granted.');

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const { data: { user } } = await supabase.auth.getUser();
  const json = subscription.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    endpoint: json.endpoint,
    keys_p256dh: json.keys.p256dh,
    keys_auth: json.keys.auth,
  }, { onConflict: 'endpoint' });
  if (error) throw error;

  return subscription;
}

export async function unsubscribeFromPush() {
  if (!pushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
  await subscription.unsubscribe();
}

export async function isSubscribed() {
  if (!pushSupported()) return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return !!subscription;
}

/** Fires a real push through the actual server round-trip — the
 *  honest way to test this, not a local Notification() call that
 *  would work even if the server-side sending was broken. */
export async function sendTestPush() {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch('/.netlify/functions/send-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ title: 'Test notification', body: 'If you can see this, push is working end to end.' }),
  });
  if (!res.ok) throw new Error((await res.json())?.error || 'Failed to send test push');
}
