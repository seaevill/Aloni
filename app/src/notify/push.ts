import type { AppDB } from '../db/schema';
import { putLocal } from '../repo';

// Web Push SUBSCRIPTION (M4 preparation). It only asks the browser for a subscription and keeps it on this phone; nothing is sent to any server yet and no notification is sent.
// It needs the PUBLIC application server key (VAPID public key), which is empty until Bora creates it: until then the card says «not available yet» and nothing is requested.
export const PUSH = { vapidPublicKey: '' };   // public by design; the private key never comes near this repository
export const SUBSCRIPTION_KEY = 'push_subscription';

export type PushSupport = 'ready' | 'no_key' | 'unsupported' | 'denied';
export function pushSupport(env: { hasServiceWorker: boolean; hasPush: boolean; permission: NotificationPermission | undefined }, key: string): PushSupport {
  if (!env.hasServiceWorker || !env.hasPush) return 'unsupported';
  if (env.permission === 'denied') return 'denied';
  if (key === '') return 'no_key';
  return 'ready';
}

/** Asks for permission and subscribes; the subscription stays on the phone (device setting). Returns true when there is one. */
export async function subscribe(db: AppDB, key: string): Promise<boolean> {
  if (key === '' || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));
  await putLocal(db, SUBSCRIPTION_KEY, sub.toJSON());
  return true;
}

export async function unsubscribe(db: AppDB): Promise<void> {
  if ('serviceWorker' in navigator) { const reg = await navigator.serviceWorker.ready; await (await reg.pushManager.getSubscription())?.unsubscribe(); }
  await putLocal(db, SUBSCRIPTION_KEY, null);   // forgotten on this phone
}
