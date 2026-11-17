import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { buildAnalysis, EC_UNITS, TABLES, type AnalysisInput } from '../../src/analyses/analysis';
import { put } from '../../src/repo';
import { TEST_FARM_ID, newDb } from '../helpers/factories';

const now = '2026-11-20T10:00:00.000Z';
const input = (over: Partial<AnalysisInput> = {}): AnalysisInput => ({ parcelId: 'p1', sampledOn: '2026-11-10', lab: '', ph: '7,4', ec: '1,2', ecUnit: 'dS/m', notes: '', photoId: undefined, ...over });
const build = (i: AnalysisInput) => buildAnalysis(i, TEST_FARM_ID, now, 'a-1');

describe('buildAnalysis', () => {
  it('keeps pH and EC exactly as typed, with the EC unit the lab used; empty extras are not recorded', () => {
    const r = build(input());
    expect(r).toMatchObject({ ok: true, row: { id: 'a-1', parcel_id: 'p1', sampled_on: '2026-11-10', ph: '7.4', ec: '1.2', ec_unit: 'dS/m', deleted_at: null } });
    expect(r.ok && ['lab', 'notes', 'photo_id'].some((k) => k in r.row)).toBe(false);
    expect(build(input({ lab: ' Αγρολαμπ ', notes: 'ΟΥ 2,1 %', photoId: 'ph-1' }))).toMatchObject({ ok: true, row: { lab: 'Αγρολαμπ', notes: 'ΟΥ 2,1 %', photo_id: 'ph-1' } });
    expect(build(input({ ph: '7,40' }))).toMatchObject({ row: { ph: '7.40' } }); // trailing zero kept
  });
  it('an empty pH or EC is «not recorded», never 0', () => {
    const r = build(input({ ph: '', ec: '', ecUnit: undefined }));
    expect(r.ok && ['ph', 'ec', 'ec_unit'].some((k) => k in r.row)).toBe(false);
  });
  it('needs a parcel and a real date', () => {
    expect(build(input({ parcelId: '' }))).toMatchObject({ ok: false, parcel: true });
    for (const bad of ['', 'Invalid Date', '2026-02-31', '10/11/2026']) expect(build(input({ sampledOn: bad })), bad).toMatchObject({ ok: false, date: true });
  });
  it('a typed pH outside 0–14 or unreadable, and an unreadable EC, are refused, never guessed', () => {
    for (const bad of ['15', '14,1', 'abc', '-1', '7.400', '1.000']) expect(build(input({ ph: bad })), bad).toMatchObject({ ok: false, ph: true });
    for (const bad of ['abc', '-0,5', '1.000']) expect(build(input({ ec: bad })), bad).toMatchObject({ ok: false, ec: true });
    expect(build(input({ ph: '14' })).ok).toBe(true);
    expect(build(input({ ph: '0' })).ok).toBe(true);
  });
  it('mS/cm is a unit too, stored exactly as printed', () => {
    expect(build(input({ ec: '1,2', ecUnit: 'mS/cm' }))).toMatchObject({ ok: true, row: { ec: '1.2', ec_unit: 'mS/cm' } });
    expect([...EC_UNITS]).toEqual(['dS/m', 'mS/cm', 'uS/cm']);
  });
  it('an EC needs the unit from the report (no default, no conversion)', () => {
    expect(build(input({ ecUnit: undefined }))).toMatchObject({ ok: false, ecUnit: true });
    expect(build(input({ ec: '850', ecUnit: 'uS/cm' }))).toMatchObject({ ok: true, row: { ec: '850', ec_unit: 'uS/cm' } });
  });
});

describe('storage', () => {
  it('soil and water analyses go through the one write path and survive the database unchanged', async () => {
    const db = await newDb();
    const r = build(input({ lab: 'X' }));
    if (!r.ok) throw new Error('setup');
    for (const kind of ['soil', 'water'] as const) await put(db, TABLES[kind], { ...r.row, id: `a-${kind}` }, 'insert');
    expect(await db.soil_tests.get('a-soil')).toMatchObject({ ph: '7.4', ec_unit: 'dS/m' });
    expect(await db.water_tests.get('a-water')).toMatchObject({ ph: '7.4' });
    expect((await db.outbox.toArray()).map((o) => o.table).sort()).toEqual(['soil_tests', 'water_tests']);
  });
});
