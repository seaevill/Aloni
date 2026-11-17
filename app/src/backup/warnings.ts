// When to warn (pure, tested). «Μόνο σε αυτό το τηλέφωνο»: until the server exists, the phone holds the only copy.
export const STALE_DAYS = 7;

/** true when there is something to lose and the last backup is missing or older than 7 days. */
export function backupStale(lastIso: string | undefined, nowMs: number, hasData: boolean): boolean {
  if (!hasData) return false;
  if (!lastIso) return true; // never
  const last = Date.parse(lastIso);
  return Number.isNaN(last) || nowMs - last > STALE_DAYS * 86_400_000; // an unreadable date counts as stale
}

/** iOS may delete the data of a site that is not on the Home Screen, and of storage the browser did not make persistent. */
export function storageWarnings(env: { standalone: boolean; ios: boolean; persisted: boolean | undefined }): Array<'warn.homescreen' | 'warn.persist'> {
  const out: Array<'warn.homescreen' | 'warn.persist'> = [];
  if (env.ios && !env.standalone) out.push('warn.homescreen');
  if (env.persisted === false) out.push('warn.persist');
  return out;
}
