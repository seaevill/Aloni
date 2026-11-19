import { effect, signal } from '@preact/signals';
import { dataVersion } from '../db';
import { tab } from '../ui/nav';

// A new version of the app is NEVER applied behind the user's back (T2, 2026-11-19: a silent reload on deploy made the screen vanish under a half-typed form). The service worker waits
// (registerType 'prompt', no skipWaiting, no clientsClaim); the app shows a small bar «Νέα έκδοση · Ενημέρωση». It applies the update by itself ONLY when nothing can be lost.
export const needRefresh = signal(false);
export const offlineReady = signal(false);
export const dbBlocked = signal<'other' | 'closed' | undefined>(undefined);
/** true after the user typed into a field OR tapped anything inside the screen (chips, counters, pickers) and has not saved or left the tab since: a reload would lose that state */
export const dirty = signal(false);

export interface Situation { dirty: boolean; hidden: boolean }
/** Apply by itself only when the app is in the background and no field has been typed into; otherwise ask. */
export const mayApplyByItself = (s: Situation): boolean => s.hidden && !s.dirty;

let apply: (() => void) | undefined;
export function setApply(fn: () => void): void { apply = fn; }
/** Applies the waiting version; when no worker is waiting (or it does not react within 1.5 s) the page is simply reloaded: never a dead button, never a closed database left open. */
export function applyNow(): void {
  apply?.();
  setTimeout(() => location.reload(), 1500);
}

export function onNeedRefresh(): void {
  needRefresh.value = true;
  if (mayApplyByItself({ dirty: dirty.value, hidden: document.visibilityState === 'hidden' })) applyNow();
}
export function onOfflineReady(): void { offlineReady.value = true; }

/** Starts the bookkeeping: a field typed into marks the screen as dirty (kept until the tab changes); coming back to the background applies a waiting update when nothing can be lost. */
export function watchDirty(): void {
  const mark = (e: Event) => { const el = e.target as Element | null; if (el?.closest?.('main') && !el.closest('nav.tabs')) dirty.value = true; };
  document.addEventListener('input', mark, true); document.addEventListener('change', mark, true); document.addEventListener('click', mark, true);
  effect(() => { void tab.value; void dataVersion.value; dirty.value = false; });          // leaving the tab or saving something clears it
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') dbBlocked.value = undefined; if (needRefresh.value && mayApplyByItself({ dirty: dirty.value, hidden: document.visibilityState === 'hidden' })) applyNow(); });
  // the test hook (Playwright fires «a new version is waiting» without a real deploy)
  window.__aloniTest = { needRefresh: onNeedRefresh };
}

declare global { interface Window { __aloniTest?: { needRefresh: () => void } } }

/** Asks the browser for a newer service worker every hour and whenever the app comes back to the screen (a PWA resumed from the background on iOS would otherwise never look). */
export function watchForUpdates(reg: ServiceWorkerRegistration | undefined): void {
  if (!reg) return;
  const check = () => { void reg.update().catch(() => undefined); };
  setInterval(check, 3_600_000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
}
