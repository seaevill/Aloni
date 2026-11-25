import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { addCut, loadCuts, removeCut, resprout, CUT_METHODS } from '../../src/cuts/cuts';
import { newDb, TEST_FARM_ID as F } from '../helpers/factories';

describe('cut / clean records («Κοπή / καθαρισμός»)', () => {
  it('a record is parcel + day + method; the resprout counter starts at the cut day', () => {
    expect(CUT_METHODS).toEqual(['shredder', 'hand', 'other']);
    const cuts = [{ id: 'a', parcel_id: 'p1', day: '2026-11-21', method: 'shredder' as const }, { id: 'b', parcel_id: 'p2', day: '2026-11-01', method: 'hand' as const }];
    expect(resprout(cuts, 'p1', '2026-11-23')).toEqual({ day: '2026-11-21', method: 'shredder', n: 2 });
    expect(resprout(cuts, 'p1', '2026-11-21')).toEqual({ day: '2026-11-21', method: 'shredder', n: 0 });
    expect(resprout(cuts, 'p3', '2026-11-23')).toBeUndefined();                 // nothing recorded = nothing shown
    expect(resprout(cuts, 'p1', '2026-11-20')).toBeUndefined();                 // a cut in the future is not a start
  });
  it('the newest cut at or before today wins', () => {
    const cuts = [{ id: 'a', parcel_id: 'p1', day: '2026-10-01', method: 'hand' as const }, { id: 'b', parcel_id: 'p1', day: '2026-11-10', method: 'shredder' as const }];
    expect(resprout(cuts, 'p1', '2026-11-23')?.day).toBe('2026-11-10');
  });
  it('stored per farm on this phone; remove takes one out', async () => {
    const db = await newDb();
    expect(await loadCuts(db, F)).toEqual([]);
    const rec = await addCut(db, F, { parcel_id: 'p1', day: '2026-11-21', method: 'shredder' }, 'id-1');
    expect(rec).toMatchObject({ id: 'id-1', parcel_id: 'p1' });
    expect(await loadCuts(db, F)).toHaveLength(1);
    expect(await loadCuts(db, 'other-farm')).toEqual([]);
    await removeCut(db, F, 'id-1');
    expect(await loadCuts(db, F)).toEqual([]);
  });
  it('a bad day or an unknown method is refused', async () => {
    const db = await newDb();
    await expect(addCut(db, F, { parcel_id: 'p1', day: '21/11', method: 'shredder' }, 'x')).rejects.toThrow();
    await expect(addCut(db, F, { parcel_id: 'p1', day: '2026-11-21', method: 'fire' as never }, 'x')).rejects.toThrow();
  });
});
