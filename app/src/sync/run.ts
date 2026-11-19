// The sync RUNNER: when a sync round happens. It never overlaps itself, never runs offline or signed out, and a failure is remembered (shown, retried later), never thrown
// at the user. Built only when config.SYNC_CONNECTED and AUTH_ENABLED are both on (main.tsx).
import { effect, signal } from '@preact/signals';
import { session } from '../auth/gotrue';
import { pendingOps } from '../repo';
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
  let busy = false; let again = false;
  const run = {
    async tick(): Promise<'skipped' | 'ok' | 'failed'> {
      if (busy) { again = true; return 'skipped'; } // asked during a round (a new sign-in, another farm id): one more round follows it
      if (!d.online()) return 'skipped';
      busy = true;
      try {
        const tr = await d.transport();
        if (!tr) return 'skipped';
        const r = await syncOnce(d.db, tr, d.farm());
        syncError.value = undefined;
        if (r.written > 0 || r.sent > 0 || r.rejected > 0 || r.weather) d.changed();
        return 'ok';
      } catch (e) {
        syncError.value = e instanceof Error ? e.message : 'sync failed';
        return 'failed';
      } finally { busy = false; if (again) { again = false; void run.tick(); } }
    },
  };
  return run;
}

/** Starts the rounds: now, when the phone comes online, when the app comes back to the screen, and every minute. Returns a stop function. */
export function startSync(d: Deps, every: number): () => void {
  const run = createRunner(d);
  const go = () => { void run.tick(); };
  window.addEventListener('online', go);
  const visible = () => { if (document.visibilityState === 'visible') go(); };
  document.addEventListener('visibilitychange', visible);
  const timer = setInterval(go, every);
  // a new sign-in, another farm id, or a new record waiting in the outbox, starts a round at once (the busy guard keeps rounds from overlapping)
  const stopEffect = effect(() => { void session.value; void pendingOps.value; void d.farm(); go(); });
  return () => { window.removeEventListener('online', go); document.removeEventListener('visibilitychange', visible); clearInterval(timer); stopEffect(); };
}
