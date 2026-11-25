import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { isKaek, kaekOf, loadKaek, removeKaek, setKaek } from '../../src/kaek/kaek';
import { newDb, TEST_FARM_ID as F } from '../helpers/factories';

// ΚΑΕΚ = the 12-digit national cadastre number of a plot. The numbers below are FICTIONAL.
describe('ΚΑΕΚ of a parcel (kept on this phone, per farm)', () => {
  it('is exactly 12 digits; spaces around it are ignored; anything else is refused', () => {
    expect(isKaek('111111111111')).toBe(true);
    expect(isKaek(' 111111111111 ')).toBe(true);
    expect(isKaek('11111111111')).toBe(false);          // 11 digits
    expect(isKaek('1111111111111')).toBe(false);        // 13 digits
    expect(isKaek('11111111111a')).toBe(false);
    expect(isKaek('')).toBe(false);
  });
  it('is stored per farm and parcel, read back, and removed', async () => {
    const db = await newDb();
    expect(await loadKaek(db, F)).toEqual({});
    await setKaek(db, F, 'p1', ' 111111111111 ');
    expect(kaekOf(await loadKaek(db, F), 'p1')).toBe('111111111111');
    expect(kaekOf(await loadKaek(db, F), 'p2')).toBeUndefined();
    expect(await loadKaek(db, 'other-farm')).toEqual({});
    await removeKaek(db, F, 'p1');
    expect(await loadKaek(db, F)).toEqual({});
  });
  it('a malformed number is never stored', async () => {
    const db = await newDb();
    await expect(setKaek(db, F, 'p1', '123')).rejects.toThrow();
    expect(await loadKaek(db, F)).toEqual({});
  });
});
