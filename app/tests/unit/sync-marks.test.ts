import { describe, expect, it } from 'vitest';
import { recordMarks } from '../../src/sync/marks';

// E3: one honest mark per record, from the outbox only. Refused beats waiting beats sent; a record with no outbox entry gets NO mark (the app does not claim «sent» for what it does not know).
const op = (row_id: string, status: 'pending' | 'acked' | 'rejected') => ({ row_id, status });

describe('recordMarks', () => {
  it('pending = on the phone, acked = sent, rejected = refused', () => {
    const m = recordMarks([op('a', 'pending'), op('b', 'acked'), op('c', 'rejected')]);
    expect([m.get('a'), m.get('b'), m.get('c')]).toEqual(['phone', 'sent', 'rejected']);
  });
  it('a record with several ops shows the worst state: refused > on the phone > sent', () => {
    expect(recordMarks([op('a', 'acked'), op('a', 'pending')]).get('a')).toBe('phone');
    expect(recordMarks([op('a', 'pending'), op('a', 'rejected'), op('a', 'acked')]).get('a')).toBe('rejected');
    expect(recordMarks([op('a', 'acked'), op('a', 'acked')]).get('a')).toBe('sent');
  });
  it('a record the outbox does not know has no mark at all', () => {
    expect(recordMarks([op('a', 'acked')]).has('zzz')).toBe(false);
    expect(recordMarks([]).size).toBe(0);
  });
});
