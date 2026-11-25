import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { addWork, loadWork, removeWork, snapshotOf } from '../../src/fieldwork/fieldwork';
import { newDb, TEST_FARM_ID as F } from '../helpers/factories';

const TODAY = '2026-11-23';

describe('fertilising and irrigation RECORDS: what was done, typed by the owner; the app suggests nothing', () => {
  it('a fertilising record needs a day, the form of the nitrogen (as written on the package) and may carry the kg of N per στρέμμα exactly as typed', async () => {
    const db = await newDb();
    const r = await addWork(db, F, { parcel_id: 'p1', kind: 'fertilise', day: '2026-11-20', n_form: ' urea ', n_kg_per_str: '4,5' }, 'w1', TODAY);
    expect(r).toMatchObject({ id: 'w1', kind: 'fertilise', day: '2026-11-20', n_form: 'urea', n_kg_per_str: '4,5' });
    expect(await loadWork(db, F)).toHaveLength(1);
    expect(await loadWork(db, 'other-farm')).toEqual([]);
  });
  it('the N form is mandatory (urea and nitrate behave differently); a quantity that is not a number is refused, never read as 0', async () => {
    const db = await newDb();
    await expect(addWork(db, F, { parcel_id: 'p1', kind: 'fertilise', day: '2026-11-20', n_form: '  ' }, 'w', TODAY)).rejects.toThrow();
    await expect(addWork(db, F, { parcel_id: 'p1', kind: 'fertilise', day: '2026-11-20', n_form: 'urea', n_kg_per_str: 'abc' }, 'w', TODAY)).rejects.toThrow();
    expect(await loadWork(db, F)).toEqual([]);
  });
  it('an irrigation record needs minutes (whole) or m³ (decimal), at least one', async () => {
    const db = await newDb();
    await expect(addWork(db, F, { parcel_id: 'p1', kind: 'irrigate', day: '2026-11-21' }, 'w', TODAY)).rejects.toThrow();
    await expect(addWork(db, F, { parcel_id: 'p1', kind: 'irrigate', day: '2026-11-21', minutes: '12.5' }, 'w', TODAY)).rejects.toThrow();
    const r = await addWork(db, F, { parcel_id: 'p1', kind: 'irrigate', day: '2026-11-21', minutes: '90', m3: '3,5' }, 'w2', TODAY);
    expect(r).toMatchObject({ kind: 'irrigate', minutes: '90', m3: '3,5' });
  });
  it('a day in the future or not a date is refused (it is a record of what happened)', async () => {
    const db = await newDb();
    await expect(addWork(db, F, { parcel_id: 'p1', kind: 'irrigate', day: '2026-11-24', minutes: '10' }, 'w', TODAY)).rejects.toThrow();
    await expect(addWork(db, F, { parcel_id: 'p1', kind: 'irrigate', day: '24/11', minutes: '10' }, 'w', TODAY)).rejects.toThrow();
  });
  it('the weather of that day is copied from the stored weather, only the values that are known; none = nothing is invented', async () => {
    const days = [{ date: '2026-11-20', tmin: 4, tmax: 14.5, rain: 0, wind: undefined, gust: 22 }];
    expect(snapshotOf(days, '2026-11-20')).toEqual({ tmin: 4, tmax: 14.5, rain: 0, gust: 22 });
    expect(snapshotOf(days, '2026-11-19')).toBeUndefined();
    const db = await newDb();
    const r = await addWork(db, F, { parcel_id: 'p1', kind: 'irrigate', day: '2026-11-20', minutes: '30' }, 'w3', TODAY, snapshotOf(days, '2026-11-20'));
    expect(r.weather).toEqual({ tmin: 4, tmax: 14.5, rain: 0, gust: 22 });
    const none = await addWork(db, F, { parcel_id: 'p1', kind: 'irrigate', day: '2026-11-19', minutes: '30' }, 'w4', TODAY, snapshotOf(days, '2026-11-19'));
    expect('weather' in none).toBe(false);
  });
  it('remove takes one record out', async () => {
    const db = await newDb();
    await addWork(db, F, { parcel_id: 'p1', kind: 'irrigate', day: '2026-11-21', minutes: '10' }, 'w', TODAY);
    await removeWork(db, F, 'w');
    expect(await loadWork(db, F)).toEqual([]);
  });
});
