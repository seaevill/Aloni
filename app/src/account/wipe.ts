// E7: deleting the data on THIS phone (the owner's own copy). It is never one tap: a fresh backup file first (the owner's own copy for the 3-year duty), the farm name typed, and nothing that was not yet
// sent to the server (a deletion would lose it). The server account is a separate, later step; this file never claims it was deleted.
export const WIPE_BACKUP_MAX_AGE_MS = 15 * 60 * 1000;

export interface WipeInput { typed: string; phrase: string; lastBackup: string | undefined; nowMs: number; unsent: number }
export type WipeAnswer = { ok: true } | { ok: false; why: 'phrase' | 'backup' | 'unsent' };

const norm = (s: string): string => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('el-GR');

/** A backup counts only if its time is readable, not in the future, and at most 15 minutes old. */
function backupIsFresh(iso: string, nowMs: number): boolean {
  const at = Date.parse(iso);
  return Number.isFinite(at) && at <= nowMs && nowMs - at <= WIPE_BACKUP_MAX_AGE_MS;
}

export function wipeAllowed(i: WipeInput): WipeAnswer {
  if (norm(i.phrase) === '' || norm(i.typed) !== norm(i.phrase)) return { ok: false, why: 'phrase' };
  if (i.lastBackup === undefined || !backupIsFresh(i.lastBackup, i.nowMs)) return { ok: false, why: 'backup' };
  if (i.unsent > 0) return { ok: false, why: 'unsent' };
  return { ok: true };
}
