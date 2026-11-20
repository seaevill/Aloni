// What the sync chip may say (B5). Only what the code KNOWS: the clock time of the last round that really worked, offline, how many records wait, that the last round failed.
// It never claims «connected» without a round that worked, and offline always wins over «works».
export interface ChipInput { connected: boolean; enabled: boolean; online: boolean; pending: number; failed: boolean; lastOk: string | undefined }
export type ChipPart = { key: 'sync.ok' | 'sync.waiting' | 'sync.offline' | 'sync.error' } | { key: 'sync.pending'; n: number } | { key: 'sync.last'; vars: { t: string } };
export interface ChipView { keys: ChipPart[]; tone: 'ok' | 'calm' | 'warn' }

export function syncChip(i: ChipInput, clock: (iso: string) => string): ChipView | undefined {
  if (!i.connected || !i.enabled) return undefined;
  const keys: ChipPart[] = [];
  if (!i.online) keys.push({ key: 'sync.offline' });
  if (i.pending > Number('0')) keys.push({ key: 'sync.pending', n: i.pending });
  if (i.failed) keys.push({ key: 'sync.error' });
  const healthy = i.online && !i.failed && i.lastOk !== undefined;
  if (healthy && i.pending === Number('0')) keys.push({ key: 'sync.ok' });
  if (i.lastOk !== undefined) keys.push({ key: 'sync.last', vars: { t: clock(i.lastOk) } });
  if (keys.length === Number('0')) return { keys: [{ key: 'sync.waiting' }], tone: 'calm' };
  return { keys, tone: i.failed ? 'warn' : healthy && i.pending === Number('0') ? 'ok' : 'calm' };
}
