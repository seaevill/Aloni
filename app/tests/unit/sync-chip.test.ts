import { describe, expect, it } from 'vitest';
import { syncChip, type ChipInput } from '../../src/sync/chip';

// B5: the sync chip says only what the code really knows: the last round that WORKED (its clock time), offline, how many records wait, and that the last round failed.
const base: ChipInput = { connected: true, enabled: true, online: true, pending: 0, failed: false, lastOk: undefined };
const say = (over: Partial<ChipInput>) => syncChip({ ...base, ...over }, (iso) => iso.slice(11, 16));

describe('the sync chip', () => {
  it('says nothing when there is no server or the owner has not switched sync on', () => {
    expect(say({ connected: false })).toBeUndefined();
    expect(say({ enabled: false })).toBeUndefined();
  });
  it('healthy: «sync works · last: HH:MM» only after a round really worked; before that it says it is waiting for the first one', () => {
    expect(say({ lastOk: '2026-11-21T14:32:10Z' })).toEqual({ keys: [{ key: 'sync.ok' }, { key: 'sync.last', vars: { t: '14:32' } }], tone: 'ok' });
    expect(say({})).toEqual({ keys: [{ key: 'sync.waiting' }], tone: 'calm' });
  });
  it('records waiting are counted exactly and the last good time stays visible', () => {
    expect(say({ pending: 3, lastOk: '2026-11-21T14:32:10Z' })).toEqual({ keys: [{ key: 'sync.pending', n: 3 }, { key: 'sync.last', vars: { t: '14:32' } }], tone: 'calm' });
  });
  it('offline wins over «works»: it never claims a connection that is not there', () => {
    const r = say({ online: false, pending: 2, lastOk: '2026-11-21T14:32:10Z' });
    expect(r?.keys.map((k) => k.key)).toEqual(['sync.offline', 'sync.pending', 'sync.last']);
    expect(r?.keys.some((k) => k.key === 'sync.ok')).toBe(false);
    expect(r?.tone).toBe('calm');
  });
  it('a failed round is said plainly, with the last good time; it is never shown as «works»', () => {
    const r = say({ failed: true, pending: 1, lastOk: '2026-11-21T14:32:10Z' });
    expect(r?.keys.map((k) => k.key)).toEqual(['sync.pending', 'sync.error', 'sync.last']);
    expect(r?.tone).toBe('warn');
    expect(say({ failed: true })?.keys.map((k) => k.key)).toEqual(['sync.error']);
  });
});
