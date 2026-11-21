import { describe, expect, it } from 'vitest';
import { harvestTable } from '../../src/summary/drill';
import { cratesLogged } from '../../src/summary/today';
import type { Row } from '../../src/db/schema';

// Σήμερα «Κλούβες 7 ημ.»: the tile and the table behind it must be ONE number from ONE window (the last 7 Athens calendar days, today included). They used to disagree (tile 0 / detail 44): one counted calendar days, the other a rolling 7×24 h.
const now = '2026-11-21T10:00:00.000Z';                       // 12:00 on Sat 21 Nov in Athens
const h = (id: string, crates: string, at: string): Row => ({ id, farm_id: 'f', planting_id: 'p1', crates_str: crates, harvested_at: at });
const plantings = [{ id: 'p1', farm_id: 'f', crop_id: 'c1', parcel_id: 'pa1' }] as Row[];
const same = (rows: Row[]) => { const t = harvestTable(rows, plantings, [], [], now, 7).total; expect(t).toBe(cratesLogged(rows, now, 7)); return t; };

describe('one window for the tile and the table', () => {
  it('a harvest on the 14th at 13:00 (Athens) is OUTSIDE the last 7 calendar days (15–21) for both, even though it is less than 7×24 h ago', () => {
    expect(same([h('a', '12', '2026-11-14T11:00:00.000Z')])).toBeUndefined();
  });
  it('a harvest later today (after «now») is INSIDE for both', () => {
    expect(same([h('a', '5', '2026-11-21T20:00:00.000Z')])).toBe(5);
  });
  it('the first calendar day of the window is inside: 15 Nov 00:30 Athens', () => {
    expect(same([h('a', '7', '2026-11-14T22:30:00.000Z'), h('b', '2', '2026-11-21T08:00:00.000Z')])).toBe(9);
  });
  it('an unreadable count is not added by either; nothing readable = undefined for both', () => {
    expect(same([h('a', 'many', '2026-11-20T08:00:00.000Z')])).toBeUndefined();
  });
});
