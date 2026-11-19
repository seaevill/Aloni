import { describe, expect, it } from 'vitest';
import { EXPECTED_MIGRATION, readinessOf } from '../../src/settings/readiness';

const controller = { name: 'a', address: 'b', phone: 'c' };
describe('sign-in readiness', () => {
  it('everything missing at first: not ready', () => {
    const r = readinessOf({ controller: undefined, business: undefined, confirmed: undefined });
    expect(r.ready).toBe(false); expect(r.items.every((i) => !i.ok)).toBe(true);
  });
  it('all five done: ready', () => {
    expect(readinessOf({ controller, business: { farm_name: 'x', vat_id: '123' }, confirmed: { migration: EXPECTED_MIGRATION, advisor: true } }).ready).toBe(true);
  });
  it('an older migration confirmation, a blank farm name or an incomplete controller are not enough', () => {
    expect(readinessOf({ controller, business: { farm_name: 'x', vat_id: '1' }, confirmed: { migration: '0019', advisor: true } }).ready).toBe(false);
    expect(readinessOf({ controller, business: { farm_name: '  ', vat_id: '1' }, confirmed: { migration: EXPECTED_MIGRATION, advisor: true } }).ready).toBe(false);
    expect(readinessOf({ controller: { ...controller, phone: '' }, business: { farm_name: 'x', vat_id: '1' }, confirmed: { migration: EXPECTED_MIGRATION, advisor: true } }).ready).toBe(false);
  });
});
