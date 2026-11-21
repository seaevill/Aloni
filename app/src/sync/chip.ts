// What the sync chip may say (B5). Only what the code KNOWS: the clock time of the last round that really worked, offline, how many records wait, how many the server REFUSED, that the last round failed.
// «Works» needs ALL of: online, nothing waiting, nothing refused, no failure, and a good round that is RECENT. It never claims a connection without that, and offline always wins.
export const FRESH_MS = 180_000;   // the runner goes every minute: a good round older than 3 minutes is not «works» any more
export interface ChipInput { connected: boolean; enabled: boolean; online: boolean; pending: number; rejected: number; failed: boolean; lastOk: string | undefined; now: number }
export type ChipPart = { key: 'sync.ok' | 'sync.waiting' | 'sync.offline' | 'sync.error' } | { key: 'sync.pending' | 'sync.refused'; n: number } | { key: 'sync.last'; vars: { t: string } };
export interface ChipView { keys: ChipPart[]; tone: 'ok' | 'calm' | 'warn' }

export function syncChip(i: ChipInput, clock: (iso: string) => string): ChipView | undefined {
  if (!i.connected || !i.enabled) return undefined;
  const keys: ChipPart[] = [];
  const zero = Number('0');
  if (!i.online) keys.push({ key: 'sync.offline' });
  if (i.pending > zero) keys.push({ key: 'sync.pending', n: i.pending });
  if (i.rejected > zero) keys.push({ key: 'sync.refused', n: i.rejected });
  if (i.failed) keys.push({ key: 'sync.error' });
  const recent = i.lastOk !== undefined && i.now - Date.parse(i.lastOk) <= FRESH_MS;
  const works = i.online && !i.failed && i.pending === zero && i.rejected === zero && recent;
  if (works) keys.push({ key: 'sync.ok' });
  if (i.lastOk !== undefined) keys.push({ key: 'sync.last', vars: { t: clock(i.lastOk) } });
  if (keys.length === zero) return { keys: [{ key: 'sync.waiting' }], tone: 'calm' };
  return { keys, tone: i.failed || i.rejected > zero ? 'warn' : works ? 'ok' : 'calm' };
}
