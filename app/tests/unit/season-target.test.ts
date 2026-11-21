import { describe, expect, it } from 'vitest';
import { parseTarget, seasonProgress } from '../../src/summary/target';

// E6: the season target per crop. Only LOGGED harvests count; a count nobody can read is counted apart and never added; percent is rounded DOWN (never claims more than was done); days are Athens days.
const plantings = [{ id: 'p1', farm_id: 'f', crop_id: 'spinach', deleted_at: null }, { id: 'p2', farm_id: 'f', crop_id: 'lettuce', deleted_at: null }];
const h = (id: string, planting_id: string, crates_str: string, harvested_at: string) => ({ id, farm_id: 'f', planting_id, crates_str, harvested_at });
const target = { crates: '100', since: '2026-03-01' };
const now = '2026-04-10T10:00:00.000Z';

describe('seasonProgress', () => {
  it('adds the readable crates of this crop since the start day; other crops, earlier days and unreadable counts are not added', () => {
    const rows = [h('a', 'p1', '30', '2026-03-05T08:00:00.000Z'), h('b', 'p1', '20', '2026-04-01T08:00:00.000Z'), h('c', 'p1', '99', '2026-02-20T08:00:00.000Z'), h('d', 'p2', '40', '2026-03-10T08:00:00.000Z'), h('e', 'p1', 'about ten', '2026-03-12T08:00:00.000Z')];
    expect(seasonProgress('spinach', plantings, rows, target, now)).toEqual({ target: 100, done: 50, remaining: 50, percent: 50, over: 0, unreadable: 1 });
  });
  it('percent is rounded DOWN: 1 of 3 is 33, never 34; 99.x never shows 100', () => {
    expect(seasonProgress('spinach', plantings, [h('a', 'p1', '1', '2026-03-05T08:00:00.000Z')], { crates: '3', since: '2026-03-01' }, now)?.percent).toBe(33);
    expect(seasonProgress('spinach', plantings, [h('a', 'p1', '199', '2026-03-05T08:00:00.000Z')], { crates: '200', since: '2026-03-01' }, now)?.percent).toBe(99);
  });
  it('over the target: nothing remains, the ring stops at 100 and the extra is said', () => {
    expect(seasonProgress('spinach', plantings, [h('a', 'p1', '120', '2026-03-05T08:00:00.000Z')], target, now)).toMatchObject({ done: 120, remaining: 0, percent: 100, over: 20 });
  });
  it('no readable harvest = done, remaining and percent are unknown (never 0)', () => {
    expect(seasonProgress('spinach', plantings, [], target, now)).toEqual({ target: 100, done: undefined, remaining: undefined, percent: undefined, over: 0, unreadable: 0 });
    expect(seasonProgress('spinach', plantings, [h('e', 'p1', 'x', '2026-03-12T08:00:00.000Z')], target, now)).toMatchObject({ done: undefined, unreadable: 1 });
  });
  it('the start day is an Athens day: 23:30 on the 1st (Athens) is before a start on the 2nd; 00:30 on the 2nd is in', () => {
    const t2 = { crates: '10', since: '2026-03-02' };
    expect(seasonProgress('spinach', plantings, [h('a', 'p1', '5', '2026-03-01T21:30:00.000Z')], t2, now)?.done).toBeUndefined();
    expect(seasonProgress('spinach', plantings, [h('a', 'p1', '5', '2026-03-01T22:30:00.000Z')], t2, now)?.done).toBe(5);
  });
  it('a harvest logged after «now» is not counted', () => {
    expect(seasonProgress('spinach', plantings, [h('a', 'p1', '5', '2026-05-01T08:00:00.000Z')], target, now)?.done).toBeUndefined();
  });
});

describe('parseTarget', () => {
  it('accepts a whole number of crates above 0 and a real date', () => {
    expect(parseTarget('100', '2026-03-01')).toEqual({ ok: true, value: { crates: '100', since: '2026-03-01' } });
  });
  it('says which field is wrong; nothing is guessed (no default crates, no default date)', () => {
    expect(parseTarget('0', '2026-03-01')).toEqual({ ok: false, why: 'crates' });
    expect(parseTarget('1,5', '2026-03-01')).toEqual({ ok: false, why: 'crates' });
    expect(parseTarget('', '2026-03-01')).toEqual({ ok: false, why: 'crates' });
    expect(parseTarget('10', '')).toEqual({ ok: false, why: 'since' });
    expect(parseTarget('10', '2026-13-40')).toEqual({ ok: false, why: 'since' });
  });
});
