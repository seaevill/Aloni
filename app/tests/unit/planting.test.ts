import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { CATALOG, cropRow } from '../../src/crops/catalog';
import { athensToday, buildPlanting, exceedsParcel, validDate, type PlantingInput } from '../../src/plantings/planting';
import { put } from '../../src/repo';
import { TEST_FARM_ID, newDb } from '../helpers/factories';

const now = '2026-11-20T10:00:00.000Z';
const input = (over: Partial<PlantingInput> = {}): PlantingInput => ({ parcelId: 'p1', cropId: 'c1', variety: '', lot: '', area: '0,25', sownOn: '2026-11-17', status: 'growing', ...over });
const build = (i: PlantingInput) => buildPlanting(i, TEST_FARM_ID, now, 'id-1');

describe('buildPlanting', () => {
  it('keeps the area exactly as typed and stores variety/lot only when written', () => {
    const r = build(input());
    expect(r).toMatchObject({ ok: true, row: { id: 'id-1', parcel_id: 'p1', crop_id: 'c1', area_str: '0.25', sown_on: '2026-11-17', status: 'growing', deleted_at: null } });
    expect(r.ok && ('variety' in r.row || 'lot_label' in r.row)).toBe(false);
    expect(build(input({ variety: ' Ροζ ', lot: 'A1' }))).toMatchObject({ ok: true, row: { variety: 'Ροζ', lot_label: 'A1' } });
  });
  it('refuses a missing parcel/crop, an ambiguous or zero area and an impossible date (nothing is guessed)', () => {
    expect(build(input({ parcelId: '' }))).toMatchObject({ ok: false, parcel: true });
    expect(build(input({ cropId: '' }))).toMatchObject({ ok: false, crop: true });
    expect(build(input({ area: '' }))).toMatchObject({ ok: false, area: 'missing' });
    for (const bad of ['1.000', '0', '-1', 'abc', 'NaN']) expect(build(input({ area: bad })), bad).toMatchObject({ ok: false, area: 'invalid' });
    for (const bad of ['', '2026-02-31', '17/11/2026', 'Invalid Date', '2026-13-01']) expect(build(input({ sownOn: bad })), bad).toMatchObject({ ok: false, date: true });
  });
});

describe('dates', () => {
  it('validDate accepts only real calendar days', () => {
    expect(validDate('2028-02-29')).toBe(true);
    for (const bad of ['2027-02-29', '2026-00-10', '', 'x', '2026-1-1']) expect(validDate(bad), bad).toBe(false);
  });
  it('athensToday follows Europe/Athens, not UTC, and gives nothing for a broken clock', () => {
    expect(athensToday(new Date('2026-11-17T22:30:00Z'))).toBe('2026-11-18'); // already after midnight in Athens
    expect(athensToday(new Date('2026-07-17T20:59:00Z'))).toBe('2026-07-17');
    expect(athensToday(new Date(NaN))).toBeUndefined();
  });
});

describe('area warning (never a block)', () => {
  it('warns only when the planting is larger than the parcel and both areas are readable', () => {
    expect(exceedsParcel('2', '1.5')).toBe(true);
    expect(exceedsParcel('1,5', '1.5')).toBe(false);
    expect(exceedsParcel('2', undefined)).toBe(false);
    expect(exceedsParcel('abc', '1')).toBe(false);
    expect(exceedsParcel('2', 1.5)).toBe(true); // demo parcels store numbers
  });
});

describe('storage', () => {
  it('a crop row is the same on every planting; the write goes through the outbox', async () => {
    const db = await newDb();
    const crop = CATALOG[0];
    const a = await cropRow(crop, TEST_FARM_ID, now);
    expect((await cropRow(crop, TEST_FARM_ID, now)).id).toBe(a.id);
    expect((await cropRow(crop, '22222222-2222-4222-8222-222222222222', now)).id).not.toBe(a.id);
    const r = build(input({ cropId: a.id }));
    if (!r.ok) throw new Error('setup');
    await put(db, 'crops', a, 'insert');
    await put(db, 'plantings', r.row, 'insert');
    expect((await db.outbox.toArray()).filter((o) => o.table === 'plantings').length).toBe(1);
  });
  it('the catalog carries names only: no weights, doses or anything agronomic', () => {
    for (const c of CATALOG) expect(Object.keys(c).sort()).toEqual(['el', 'en', 'latin', 'slug', 'tr']);
  });
});

describe('Bora\'s crop list (2026-11-19)', () => {
  it('all 17 crops are in the catalog with the Greek and Turkish names he wrote; slugs are unique; a Latin name is empty rather than guessed', () => {
    const wanted: Array<[string, string]> = [['Άνηθος', 'Dereotu'], ['Αντίδια', 'Endivyen (kıvırcık hindiba)'], ['Βλήτα', 'Horoz ibiği yaprağı (vlita)'], ['Καυκαλήθρα', 'Kafkalitra (yabani maydanozgil)'], ['Κόλιανδρο', 'Kişniş'], ['Κρεμμύδι (φρέσκο)', 'Taze soğan'], ['Λάχανα', 'Lahana (yaprak)'], ['Μαϊντανός', 'Maydanoz'], ['Μυρώνι', 'Mironi (yabani rezene benzeri ot)'], ['Παντζάρια', 'Pancar'], ['Πράσο', 'Pırasa'], ['Ραδίκια άγρια', 'Yabani hindiba (radika)'], ['Ραπάνι', 'Turp'], ['Ρόκα', 'Roka'], ['Σέλινο', 'Kereviz (yaprak)'], ['Σέσκουλα', 'Pazı'], ['Σπανάκι', 'Ispanak']];
    for (const [el, tr] of wanted) expect(CATALOG.some((c) => c.el === el && c.tr === tr), el).toBe(true);
    expect(CATALOG).toHaveLength(17);
    expect(new Set(CATALOG.map((c) => c.slug)).size).toBe(17);
    for (const c of CATALOG) expect(typeof c.latin).toBe('string');
  });
});
