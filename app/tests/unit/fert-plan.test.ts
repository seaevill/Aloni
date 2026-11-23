import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { addItem, dueDay, loadPlans, removeItem, setPhoto } from '../../src/fert/plan';
import { newDb, TEST_FARM_ID as F } from '../helpers/factories';

describe('fertiliser plan: the agronomist\'s own words, kept as written (the app suggests nothing)', () => {
  it('an item is a day after sowing and the text exactly as the agronomist wrote it; stored per farm and planting', async () => {
    const db = await newDb();
    expect(await loadPlans(db, F)).toEqual({});
    await addItem(db, F, 'pl1', { day: '20', text: '  as written by the agronomist  ' }, 'i1');
    await addItem(db, F, 'pl1', { day: '35', text: 'second line' }, 'i2');
    const plans = await loadPlans(db, F);
    expect(plans.pl1?.items).toEqual([{ id: 'i1', day: '20', text: 'as written by the agronomist' }, { id: 'i2', day: '35', text: 'second line' }]);
    expect(await loadPlans(db, 'other')).toEqual({});
  });
  it('items stay in day order; remove takes one out', async () => {
    const db = await newDb();
    await addItem(db, F, 'pl1', { day: '35', text: 'b' }, 'i2'); await addItem(db, F, 'pl1', { day: '20', text: 'a' }, 'i1');
    expect((await loadPlans(db, F)).pl1?.items.map((i) => i.id)).toEqual(['i1', 'i2']);
    await removeItem(db, F, 'pl1', 'i1');
    expect((await loadPlans(db, F)).pl1?.items.map((i) => i.id)).toEqual(['i2']);
  });
  it('an empty text or a day that is not a whole number is refused (nothing is guessed)', async () => {
    const db = await newDb();
    await expect(addItem(db, F, 'pl1', { day: '', text: 'x' }, 'a')).rejects.toThrow();
    await expect(addItem(db, F, 'pl1', { day: '2.5', text: 'x' }, 'a')).rejects.toThrow();
    await expect(addItem(db, F, 'pl1', { day: '20', text: '   ' }, 'a')).rejects.toThrow();
  });
  it('the photo of the agronomist\'s paper is kept by id', async () => {
    const db = await newDb();
    await setPhoto(db, F, 'pl1', 'photo-1');
    expect((await loadPlans(db, F)).pl1?.photoId).toBe('photo-1');
  });
  it('the day of an item is the sowing day plus N; no sowing day = unknown', () => {
    expect(dueDay('2026-11-22', '20')).toBe('2026-12-12');
    expect(dueDay('', '20')).toBeUndefined();
    expect(dueDay('2026-11-22', 'x')).toBeUndefined();
  });
});
