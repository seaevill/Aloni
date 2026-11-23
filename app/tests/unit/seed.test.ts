import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { loadRates, removeRate, seedKg, setRate } from '../../src/seed/seed';
import { newDb, TEST_FARM_ID as F } from '../helpers/factories';

describe('seed needed = the seed rate the grower (or his agronomist) wrote × the area; the app proposes no rate', () => {
  it('multiplies the typed rate (kg per στρέμμα) by the planting area, a comma or a point, exactly', () => {
    expect(seedKg('0,6', '2')).toEqual({ known: true, kg: 1.2 });
    expect(seedKg('2', '0.25')).toEqual({ known: true, kg: 0.5 });
  });
  it('no rate or a bad rate = unknown (no-rate); a missing or bad area = unknown (no-area); never 0', () => {
    expect(seedKg(undefined, '1')).toEqual({ known: false, reason: 'no-rate' });
    expect(seedKg('abc', '1')).toEqual({ known: false, reason: 'no-rate' });
    expect(seedKg('0', '1')).toEqual({ known: false, reason: 'no-rate' });
    expect(seedKg('2', '')).toEqual({ known: false, reason: 'no-area' });
    expect(seedKg('2', 'x')).toEqual({ known: false, reason: 'no-area' });
  });
  it('rates are kept per farm and crop on this phone; a bad rate is never stored', async () => {
    const db = await newDb();
    expect(await loadRates(db, F)).toEqual({});
    await setRate(db, F, 'c1', ' 0,6 ');
    expect((await loadRates(db, F)).c1).toBe('0,6');
    expect(await loadRates(db, 'other')).toEqual({});
    await expect(setRate(db, F, 'c1', 'abc')).rejects.toThrow();
    await expect(setRate(db, F, 'c1', '0')).rejects.toThrow();
    await removeRate(db, F, 'c1');
    expect(await loadRates(db, F)).toEqual({});
  });
});
