import { describe, expect, it } from 'vitest';
import { parcelWater, parcelYield, ratio } from '../../src/summary/parcel-yield';
import type { Work } from '../../src/fieldwork/fieldwork';

const parcel = { id: 'p1', farm_id: 'f', area_str: '0,8' };
const planting = (id: string, over: Record<string, unknown> = {}) => ({ id, farm_id: 'f', parcel_id: 'p1', ...over });
const harvest = (id: string, planting_id: string, crates_str: string, over: Record<string, unknown> = {}) => ({ id, farm_id: 'f', planting_id, crates_str, harvested_at: '2026-11-20T08:00:00+02:00', ...over });

describe('parcelYield: crates per στρέμμα from the stored harvest records', () => {
  it('the fixture: 0,8 στρ. and 50 crates (30 + 20) = 62,5 crates per στρέμμα, with its two source records', () => {
    const r = parcelYield(parcel, [planting('a')], [harvest('h1', 'a', '30'), harvest('h2', 'a', '20', { harvested_at: '2026-11-22T08:00:00+02:00' })]);
    expect(r).toMatchObject({ known: true, crates: 50, perStrema: '62.5' });
    expect(r.sources.map((s) => s.id)).toEqual(['h2', 'h1']);   // newest first
  });
  it('a deleted harvest and a harvest of another parcel are not counted', () => {
    const r = parcelYield(parcel, [planting('a'), { id: 'z', farm_id: 'f', parcel_id: 'other' }], [harvest('h1', 'a', '30'), harvest('gone', 'a', '99', { deleted_at: '2026-11-21T00:00:00Z' }), harvest('x', 'z', '77')]);
    expect(r).toMatchObject({ known: true, crates: 30 });
  });
  it('no harvest = unknown (never 0); no area = unknown; an unreadable crate number = unknown (never skipped)', () => {
    expect(parcelYield(parcel, [planting('a')], [])).toMatchObject({ known: false, reason: 'no-records' });
    expect(parcelYield({ id: 'p1', farm_id: 'f', area_str: '' }, [planting('a')], [harvest('h1', 'a', '5')])).toMatchObject({ known: false, reason: 'no-area' });
    expect(parcelYield({ id: 'p1', farm_id: 'f', area_str: '0' }, [planting('a')], [harvest('h1', 'a', '5')])).toMatchObject({ known: false, reason: 'no-area' });
    expect(parcelYield(parcel, [planting('a')], [harvest('h1', 'a', '5'), harvest('h2', 'a', 'πολλές')])).toMatchObject({ known: false, reason: 'unreadable', unreadable: 1 });
  });
  it('an archived planting still counts (the harvest happened): it is tagged, summed apart as archivedCrates, and part of the cumulative total', () => {
    const r = parcelYield(parcel, [planting('a'), planting('old', { deleted_at: '2026-10-01T00:00:00Z', crop_id: 'c2' })], [harvest('h1', 'a', '30'), harvest('h2', 'old', '20')]);
    expect(r).toMatchObject({ known: true, crates: 50, perStrema: '62.5', archivedCrates: 20 });
    expect(r.sources.find((s) => s.id === 'h2')).toMatchObject({ archived: true });
    expect(r.sources.find((s) => s.id === 'h1')).toMatchObject({ archived: false });
  });
  it('a DELETED harvest of an archived planting is still not counted', () => {
    const r = parcelYield(parcel, [planting('old', { deleted_at: 'x' })], [harvest('h', 'old', '9', { deleted_at: 'y' })]);
    expect(r).toMatchObject({ known: false, reason: 'no-records' });
  });
  it('the per-crop split is the same records: it sums to the cumulative total, each crop ÷ the PARCEL area', () => {
    const r = parcelYield(parcel, [planting('a', { crop_id: 'c1' }), planting('b', { crop_id: 'c2' })], [harvest('h1', 'a', '30'), harvest('h2', 'b', '12'), harvest('h3', 'a', '8')]);
    expect(r).toMatchObject({ known: true, crates: 50 });
    if (!r.known) return;
    expect(r.byCrop.map((c) => [c.cropId, c.crates, c.perStrema])).toEqual([['c1', 38, '47.5'], ['c2', 12, '15']]);
    expect(r.byCrop.reduce((a, c) => a + c.crates, Number('0'))).toBe(r.crates);
  });
  it('the harvests of another parcel never enter (cross-parcel isolation), even when the planting ids are similar', () => {
    const r = parcelYield(parcel, [planting('a'), { id: 'a2', farm_id: 'f', parcel_id: 'other' }], [harvest('h1', 'a', '30'), harvest('x', 'a2', '1000')]);
    expect(r).toMatchObject({ known: true, crates: 30 });
  });
});

const irr = (id: string, over: Partial<Work>): Work => ({ id, parcel_id: 'p1', kind: 'irrigate', day: '2026-11-20', ...over });
it('ratio is exact whole-number division, cut after six decimals', () => {
  expect([ratio('4.8', '0.8'), ratio('50', '0.3'), ratio('1', '3'), ratio('7', '2')]).toEqual(['6', '166.666666', '0.333333', '3.5']);
});
describe('parcelWater: recorded m³ and m³ per στρέμμα', () => {
  it('0,8 στρ. and 4,8 m³ (2,4 + 2,4) = 6 m³ per στρέμμα, exact sum', () => {
    expect(parcelWater(parcel, [irr('1', { m3: '2,4' }), irr('2', { m3: '2,4' })])).toMatchObject({ known: true, records: 2, m3: '4.8', perStrema: '6' });
  });
  it('one record with only minutes makes the per-στρέμμα number unknown and says how many are missing; other parcels and fertilising do not count', () => {
    const r = parcelWater(parcel, [irr('1', { m3: '2' }), irr('2', { minutes: '30' }), irr('3', { parcel_id: 'other', m3: '9' }), irr('4', { kind: 'fertilise', m3: '9' })]);
    expect(r).toMatchObject({ known: false, reason: 'missing-m3', records: 2, missing: 1 });
    expect(parcelWater(parcel, [])).toMatchObject({ known: false, reason: 'no-records' });
  });
});
