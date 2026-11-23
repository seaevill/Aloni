import { describe, expect, it } from 'vitest';
import { buildCustomer, buildCustomerOrder, buildWorkerCard } from '../../src/owner-records/records';

const F = '11111111-1111-4111-8111-111111111111'; const now = '2026-11-22T10:00:00.000Z'; const id = '22222222-2222-4222-8222-222222222222';

describe('owner-only records (SQL 0037) built on the phone', () => {
  it('a customer needs a name; phone and note are optional and trimmed; nothing else (no birth date)', () => {
    expect(buildCustomer({ name: ' ' }, F, now, id)).toEqual({ ok: false, reason: 'name' });
    const r = buildCustomer({ name: ' Μαρία ', phone: ' 69 ', note: '' }, F, now, id);
    expect(r.ok && r.row).toMatchObject({ name: 'Μαρία', phone: '69' });
    expect(r.ok && 'note' in r.row).toBe(false);
    expect(r.ok && Object.keys(r.row).some((k) => /birth|dob/.test(k))).toBe(false);
  });
  it('an order: whole crates above 0 kept as written, a real day, a customer and a crop; status starts open', () => {
    const ok = buildCustomerOrder({ customerId: 'c', cropId: 'k', crates: '12', day: '2026-11-23' }, F, now, id);
    expect(ok.ok && ok.row).toMatchObject({ crates_str: '12', for_day: '2026-11-23', status: 'open', customer_id: 'c', crop_id: 'k' });
    for (const bad of [{ crates: '' }, { crates: '0' }, { crates: '2,5' }, { crates: 'x' }, { crates: '1000000' }, { day: '2026-02-30' }, { day: '' }, { customerId: '' }, { cropId: ' ' }]) {
      expect(buildCustomerOrder({ customerId: 'c', cropId: 'k', crates: '3', day: '2026-11-23', ...bad }, F, now, id).ok).toBe(false);
    }
  });
  it('a worker card points at the roster worker; surname and phone are optional', () => {
    expect(buildWorkerCard({ workerId: '' }, F, now, id)).toEqual({ ok: false, reason: 'worker' });
    const r = buildWorkerCard({ workerId: 'w', surname: ' Παπά ', phone: '' }, F, now, id);
    expect(r.ok && r.row).toMatchObject({ worker_id: 'w', surname: 'Παπά' });
  });
});
