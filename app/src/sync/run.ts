// The sync RUNNER: when a sync round happens. It never overlaps itself, never runs offline or signed out, and a failure is remembered (shown, retried later), never thrown
// at the user. Built only when config.SYNC_CONNECTED and AUTH_ENABLED are both on (main.tsx).
import { signal } from '@preact/signals';
import type { AppDB } from '../db/schema';
import { syncOnce, type Transport } from './engine';

/** The last failure of a round (undefined = the last round worked or none ran yet). Shown as a calm line; the next round retries by itself. */
export const syncError = signal<string | undefined>(undefined);

export interface Deps {
  db: AppDB;
  /** undefined = not signed in (nothing to do). */
  transport: () => Promise<Transport | undefined>;
  farm: () => string;
  online: () => boolean;
  /** Something changed on this phone (rows pulled, ops sent): screens re-read. */
  changed: () => void;
}

export function createRunner(d: Deps): { tick: () => Promise<'skipped' | 'ok' | 'failed'> } {
  let busy = false;
  return {
    async tick() {
      if (busy || !d.online()) return 'skipped';
      busy = true;
      try {
        const tr = await d.transport();
        if (!tr) return 'skipped';
        const r = await syncOnce(d.db, tr, d.farm());
        syncError.value = undefined;
        if (r.written > 0 || r.sent > 0 || r.rejected > 0) d.changed();
        return 'ok';
      } catch (e) {
        syncError.value = e instanceof Error ? e.message : 'sync failed';
        return 'failed';
      } finally { busy = false; }
    },
  };
}

/** Starts the rounds: now, when the phone comes online, when the app comes back to the screen, and every minute. Returns a stop function. */
export function startSync(d: Deps, every: number): () => void {
  const run = createRunner(d);
  const go = () => { void run.tick(); };
  go();
  window.addEventListener('online', go);
  const visible = () => { if (document.visibilityState === 'visible') go(); };
  document.addEventListener('visibilitychange', visible);
  const timer = setInterval(go, every);
  return () => { window.removeEventListener('online', go); document.removeEventListener('visibilitychange', visible); clearInterval(timer); };
}
