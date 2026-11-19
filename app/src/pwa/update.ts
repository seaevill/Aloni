import { signal } from '@preact/signals';

// A new version of the app is NEVER applied behind the user's back (T2, 2026-11-19: a silent reload on deploy made the screen vanish under a half-typed form). The service worker waits
// (registerType 'prompt', no skipWaiting, no clientsClaim); the app shows a small bar «Νέα έκδοση · Ενημέρωση». It applies the update by itself ONLY when nothing can be lost.
export const needRefresh = signal(false);
export const offlineReady = signal(false);
export const dbBlocked = signal<'other' | 'closed' | undefined>(undefined);
/** true after the user typed into any field and has not left the tab since: a reload would lose it */
export const dirty = signal(false);

export interface Situation { dirty: boolean; hidden: boolean }
/** Apply by itself only when the app is in the background and no field has been typed into; otherwise ask. */
export const mayApplyByItself = (s: Situation): boolean => s.hidden && !s.dirty;

let apply: (() => void) | undefined;
export function setApply(fn: () => void): void { apply = fn; }
export function applyNow(): void { apply?.(); }

export function onNeedRefresh(): void {
  needRefresh.value = true;
  if (mayApplyByItself({ dirty: dirty.value, hidden: document.visibilityState === 'hidden' })) applyNow();
}
export function onOfflineReady(): void { offlineReady.value = true; }

/** Starts the bookkeeping: a field typed into marks the screen as dirty (kept until the tab changes); coming back to the background applies a waiting update when nothing can be lost. */
export function watchDirty(): void {
  document.addEventListener('input', () => { dirty.value = true; }, true);
  document.addEventListener('visibilitychange', () => { if (needRefresh.value && mayApplyByItself({ dirty: dirty.value, hidden: document.visibilityState === 'hidden' })) applyNow(); });
  // the test hook (Playwright fires «a new version is waiting» without a real deploy)
  window.__aloniTest = { needRefresh: onNeedRefresh };
}

declare global { interface Window { __aloniTest?: { needRefresh: () => void } } }
