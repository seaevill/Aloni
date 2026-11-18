// Starts the sync rounds when — and only when — the live switches are on (config.SYNC_CONNECTED and AUTH_ENABLED). Dormant otherwise: nothing is read, nothing is sent.
import { AUTH_ENABLED, BACKEND, SYNC_CONNECTED } from '../config';
import { session, tokenFor } from '../auth/gotrue';
import { loadSession, saveSession } from '../auth/store';
import { dataVersion, db, realFarmId } from '../db';
import { refreshPending } from '../repo';
import { online } from '../ui/sync';
import { httpTransport } from './http';
import { startSync } from './run';

const EVERY_MS = 60_000;

export async function bootSync(): Promise<void> {
  if (!SYNC_CONNECTED || !AUTH_ENABLED) return;
  const stored = await loadSession();
  if (stored && !session.value) { const token = await tokenFor(BACKEND, stored, Date.now(), saveSession); if (token && !session.value) session.value = stored; }
  const token = async (): Promise<string> => {
    const t = await tokenFor(BACKEND, session.value, Date.now(), saveSession);
    if (!t) throw new Error('signed out');
    return t;
  };
  startSync({
    db,
    transport: async () => (session.value ? httpTransport({ url: BACKEND.url, apiKey: BACKEND.apiKey, token }) : undefined),
    farm: () => realFarmId.value, // the REAL farm only: the Demo farm never syncs
    online: () => online.value,
    changed: () => { dataVersion.value++; void refreshPending(db); },
  }, EVERY_MS);
}
