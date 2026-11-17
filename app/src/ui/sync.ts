import { signal } from '@preact/signals';

/** true while the phone has a connection (the browser's own online/offline events). */
export const online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { online.value = true; });
  window.addEventListener('offline', () => { online.value = false; });
}
