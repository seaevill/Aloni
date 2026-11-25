import { describe, expect, it } from 'vitest';
import { savedWhere, type SavedWhereInput } from '../../src/sync/saved-where';

// Queue item 6: a record saved by the owner must say WHERE it is. A record that is only on this phone never gets a bare «recorded» as if it had reached the server.
const base: SavedWhereInput = { connected: true, enabled: true, pending: 1, demo: false };
const say = (over: Partial<SavedWhereInput>) => savedWhere({ ...base, ...over });

describe('where a saved record is', () => {
  it('no server or sync not switched on: «saved on the phone, it will be sent when an account is connected»', () => {
    expect(say({ connected: false })).toBe('worker.queued');
    expect(say({ enabled: false })).toBe('worker.queued');
    expect(say({ connected: false, pending: 0 })).toBe('worker.queued');
  });
  it('sync on and the record still waits in the outbox: «saved, will be sent when there is signal»', () => {
    expect(say({ pending: 3 })).toBe('sync.queuedSignal');
  });
  it('sync on and nothing waits any more (it was sent): no extra line, never a false «will be sent»', () => {
    expect(say({ pending: 0 })).toBeUndefined();
  });
  it('the Demo farm is never sent anywhere: no «will be sent» line at all', () => {
    expect(say({ demo: true })).toBeUndefined();
    expect(say({ demo: true, connected: false })).toBeUndefined();
  });
});
