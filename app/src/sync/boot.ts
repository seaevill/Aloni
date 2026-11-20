// Starts the sync rounds when — and only when — the live switches are on (config.SYNC_CONNECTED and AUTH_ENABLED). Dormant otherwise: nothing is read, nothing is sent.
import { AUTH_ENABLED, BACKEND, SYNC_CONNECTED } from '../config';
import { session, tokenFor } from '../auth/gotrue';
import { loadSession, saveSession } from '../auth/store';
import { dataVersion, db, realFarmId } from '../db';
import { refreshPending } from '../repo';
import { online } from '../ui/sync';
import { httpTransport } from './http';
import { startSync } from './run';
import { httpMediaPut } from './http';
import { loadSyncFlag, syncEnabled } from './golive';
import type { Transport } from './engine';

/** The transport and the photo uploader for the signed-in user; undefined when signed out. Used by the sync rounds and by the go-live wizard. */
export function liveEndpoint(): { transport: Transport; media: ReturnType<typeof httpMediaPut> } | undefined {
  if (!session.value) return undefined;
  const token = async (): Promise<string> => { const t = await tokenFor(BACKEND, session.value, Date.now(), saveSession); if (!t) throw new Error('signed out'); return t; };
  const e = { url: BACKEND.url, apiKey: BACKEND.apiKey, token };
  return { transport: httpTransport(e), media: httpMediaPut(e, realFarmId.value) };
}

const EVERY_MS = 60_000;

export async function bootSync(): Promise<void> {
  if (!SYNC_CONNECTED || !AUTH_ENABLED) return;
  await loadSyncFlag(db);   // the owner's switch (the go-live wizard); a worker's phone is switched on by the sign-in that claims the invitation
  const stored = await loadSession();
  if (stored && !session.value) { session.value = stored; await tokenFor(BACKEND, stored, Date.now(), saveSession); }   // offline at start-up keeps the session (the token is refreshed lazily); a dead one is cleared by tokenFor itself
  const token = async (): Promise<string> => {
    const t = await tokenFor(BACKEND, session.value, Date.now(), saveSession);
    if (!t) throw new Error('signed out');
    return t;
  };
  startSync({
    db,
    transport: async () => (session.value && syncEnabled.value ? httpTransport({ url: BACKEND.url, apiKey: BACKEND.apiKey, token }) : undefined),   // OFF until the wizard (or an invitation) switched it on
    farm: () => (syncEnabled.value ? realFarmId.value : ''), // the REAL farm only: the Demo farm never syncs; reading the switch here restarts the rounds when it turns on
    online: () => online.value,
    changed: () => { dataVersion.value++; void refreshPending(db); },
  }, EVERY_MS);
}
