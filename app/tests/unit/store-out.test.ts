import { describe, expect, it } from 'vitest';
import { outBySlug, outKey } from '../../src/stock/store-out';

describe('store-out: crates loaded onto a vehicle, per crop', () => {
  const rec = (day: string, client: string, slug: string, crates: number) => ({ day, client, slug, crates, at: 'x' });
  it('adds the loads of one crop over days and customers, quarters exact', () => {
    const outs = { [outKey('d1', 'c1', 'parsley')]: rec('d1', 'c1', 'parsley', 2.5), [outKey('d1', 'c2', 'parsley')]: rec('d1', 'c2', 'parsley', 4), [outKey('d2', 'c1', 'rocket')]: rec('d2', 'c1', 'rocket', 1) };
    expect(outBySlug(outs)).toEqual({ parsley: 6.5, rocket: 1 });
  });
  it('one record per day × customer × crop: confirming twice is the same record', () => {
    expect(outKey('d', 'c', 's')).toBe(outKey('d', 'c', 's'));
    const outs = { [outKey('d', 'c', 'p')]: rec('d', 'c', 'p', 3) };
    expect(outBySlug({ ...outs, [outKey('d', 'c', 'p')]: rec('d', 'c', 'p', 3) })).toEqual({ p: 3 });
  });
  it('nothing loaded = nothing taken off', () => { expect(outBySlug({})).toEqual({}); });
});
