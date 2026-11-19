import { describe, expect, it } from 'vitest';
import { applyEdit, editsOf } from '../../src/records/edits';

const parcel = { id: 'p', farm_id: 'f', name: 'Κάτω Κάμπος', area_str: '12', topo_class: 'plain', created_at: 'a', updated_at: 'a', deleted_at: null };
describe('append-only edits of a parcel or planting', () => {
  it('nothing changed = nothing recorded; a change without a reason is refused', () => {
    expect(applyEdit(parcel, { name: 'Κάτω Κάμπος', area_str: '12' }, '', 'n').kind).toBe('nochange');
    expect(applyEdit(parcel, { area_str: '12.5' }, '  ', 'n').kind).toBe('reason');
  });
  it('the row holds the new values; the history keeps ONLY the changed fields with their previous values', () => {
    const r = applyEdit(parcel, { name: 'Κάτω Κάμπος', area_str: '12.5', topo_class: undefined }, 'measured again', '2026-11-19T10:00:00Z');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.row.area_str).toBe('12.5'); expect('topo_class' in r.row).toBe(false);
      expect(editsOf(r.row)).toEqual([{ at: '2026-11-19T10:00:00Z', reason: 'measured again', before: { area_str: '12', topo_class: 'plain' } }]);
    }
  });
  it('a second edit APPENDS; the first stays as it was', () => {
    const one = applyEdit(parcel, { area_str: '13' }, 'one', 't1'); if (one.kind !== 'ok') throw new Error('x');
    const two = applyEdit(one.row, { area_str: '14' }, 'two', 't2'); if (two.kind !== 'ok') throw new Error('x');
    expect(editsOf(two.row).map((e) => [e.reason, e.before.area_str])).toEqual([['one', '12'], ['two', '13']]);
  });
  it('malformed history entries are skipped, never invented', () => { expect(editsOf({ ...parcel, edits: [{ at: 1 }, null, { at: 'a', reason: 'r', before: {} }] })).toHaveLength(1); });
});
