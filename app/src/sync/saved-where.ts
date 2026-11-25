import type { I18nKey } from '../i18n';

// Queue item 6: the line under an owner's «saved» confirmation says WHERE the record is. Only what the code knows: without a server (or before sync is switched on) the record is on this phone
// until an account is connected; with sync on it is on the phone while the outbox still holds something; once nothing waits there is no extra line. Demo rows are never queued (repo/put), so the Demo
// farm gets no «will be sent» line at all.
export interface SavedWhereInput { connected: boolean; enabled: boolean; pending: number; demo: boolean }

export function savedWhere(i: SavedWhereInput): I18nKey | undefined {
  if (i.demo) return undefined;
  if (!i.connected || !i.enabled) return 'worker.queued';
  if (i.pending > 0) return 'sync.queuedSignal';
  return undefined;
}
