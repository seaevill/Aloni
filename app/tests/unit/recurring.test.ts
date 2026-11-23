import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { addRule, dueToday, loadRules, nextOccurrence, removeRule, weekdayOf } from '../../src/recurring/recurring';
import { newDb, TEST_FARM_ID as F } from '../helpers/factories';

describe('repeating jobs («Κάθε Δευτέρα …»): written once, they appear on their day', () => {
  it('the weekday of a date is ISO: Monday = 1 … Sunday = 7', () => {
    expect(weekdayOf('2026-11-23')).toBe(1);       // Monday
    expect(weekdayOf('2026-11-27')).toBe(5);       // Friday
    expect(weekdayOf('2026-11-29')).toBe(7);
    expect(weekdayOf('nope')).toBeUndefined();
  });
  it('the next occurrence is today when today is that weekday, else the coming one', () => {
    expect(nextOccurrence(1, '2026-11-23')).toBe('2026-11-23');
    expect(nextOccurrence(1, '2026-11-24')).toBe('2026-11-30');
    expect(nextOccurrence(5, '2026-11-23')).toBe('2026-11-27');
    expect(nextOccurrence(7, '2026-11-29')).toBe('2026-11-29');
  });
  it('only the rules of today\'s weekday are due today', () => {
    const rules = [{ id: 'a', weekday: 1, title: 'Field check', scope: 'all' }, { id: 'b', weekday: 5, title: 'Clean the store', scope: 'all' }];
    expect(dueToday(rules, '2026-11-23').map((r) => r.id)).toEqual(['a']);
    expect(dueToday(rules, '2026-11-27').map((r) => r.id)).toEqual(['b']);
    expect(dueToday(rules, '2026-11-25')).toEqual([]);
  });
  it('stored per farm on this phone; an empty title or a weekday outside 1–7 is refused', async () => {
    const db = await newDb();
    expect(await loadRules(db, F)).toEqual([]);
    await addRule(db, F, { weekday: 1, title: '  Field check ', scope: 'all' }, 'r1');
    expect(await loadRules(db, F)).toEqual([{ id: 'r1', weekday: 1, title: 'Field check', scope: 'all' }]);
    expect(await loadRules(db, 'other')).toEqual([]);
    await expect(addRule(db, F, { weekday: 8, title: 'x', scope: 'all' }, 'r2')).rejects.toThrow();
    await expect(addRule(db, F, { weekday: 2, title: '   ', scope: 'all' }, 'r2')).rejects.toThrow();
    await removeRule(db, F, 'r1');
    expect(await loadRules(db, F)).toEqual([]);
  });
});
