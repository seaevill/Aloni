import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import raw from '../../../reference/prototype/data.json';
import { DEMO_FARM_ID } from '../../src/config';
import { applySeason, dayAt, plantingOutline } from '../../src/db/demo-season/load';
import { SEASON_HARVESTS, SEASON_PLANTINGS } from '../../src/db/demo-season/data';
import { insideOrOnEdge } from '../../src/db/demo-season/geometry';
import { SEASON_PARCELS } from '../../src/db/demo-season/parcels';
import { importDemo, removeDemo, type PrototypeData } from '../../src/db/import-demo';
import { FARM_TABLES } from '../../src/db/schema';
import { areaM2, validBoundary } from '../../src/map/geo';
import { parseWhole } from '@aloni/rules-core';
import { putParcel, newDb, TEST_FARM_ID } from '../helpers/factories';

const TODAY = '2026-11-26';
const load = async () => { const db = await newDb(); await importDemo(db, raw as unknown as PrototypeData); await applySeason(db, TODAY); return db; };

describe('Demo season (queue item 32a)', () => {
  it('the classic parcels are replaced by the seven season parcels; crops, products and label uses stay', async () => {
    const db = await load();
    expect(await db.parcels.where('farm_id').equals(DEMO_FARM_ID).count()).toBe(7);
    expect(await db.plantings.count()).toBe(SEASON_PLANTINGS.length);
    expect(await db.crops.count()).toBeGreaterThanOrEqual(10); expect(await db.products.count()).toBe(17); expect(await db.label_uses.count()).toBeGreaterThan(0);
    expect(await db.weather.where('farm_id').equals(DEMO_FARM_ID).count()).toBe(7);
    expect(await db.job_harvest.count()).toBe(SEASON_HARVESTS.length);
  });
  it('every row belongs to the Demo farm: a real farm on the same phone is untouched, and removing the Demo removes it all', async () => {
    const db = await load();
    const real = await putParcel(db, { name: 'Real parcel' }, TEST_FARM_ID);
    for (const t of FARM_TABLES) for (const r of await db[t].toArray()) if (r.farm_id !== TEST_FARM_ID) expect(r.farm_id, t).toBe(DEMO_FARM_ID);
    await applySeason(db, TODAY);                                                      // loading twice: same ids, no duplicates
    expect(await db.parcels.where('farm_id').equals(DEMO_FARM_ID).count()).toBe(7);
    await removeDemo(db);
    for (const t of FARM_TABLES) expect(await db[t].where('farm_id').equals(DEMO_FARM_ID).count(), t).toBe(0);
    expect((await db.parcels.get(String(real.id)))?.name).toBe('Real parcel');
  });
  it('every planting has a drawn outline that is a valid polygon INSIDE its parcel; outlines of one parcel do not overlap; typed areas fit the parcel', () => {
    for (const parcel of SEASON_PARCELS) {
      const mine = SEASON_PLANTINGS.filter((p) => p.parcel === parcel.id); expect(mine.length, parcel.name).toBeGreaterThanOrEqual(1); expect(mine.length).toBeLessThanOrEqual(3);
      let typed = 0; const xr: Array<[number, number]> = [];
      for (const p of mine) {
        const o = plantingOutline(p);
        expect(validBoundary(o.boundary), p.id).toBe(true);
        for (const v of o.boundary.coordinates[0]!) expect(insideOrOnEdge(v as [number, number], parcel.boundary.coordinates[0]!), `${p.id} vertex ${v}`).toBe(true);
        const xs = o.boundary.coordinates[0]!.map((c) => c[0]!); xr.push([Math.min(...xs), Math.max(...xs)]);
        typed += parseFloat(o.area_str); expect(parseFloat(o.area_str), p.id).toBeGreaterThan(0);
        const drawn = (areaM2(o.boundary) ?? 0) / 1000; expect(Math.abs(drawn - parseFloat(o.area_str)) / drawn, `${p.id} drawn ${drawn}`).toBeLessThan(0.06);
      }
      expect(typed, parcel.name).toBeLessThanOrEqual(parseFloat(parcel.area_str));
      const sorted = [...xr].sort((a, b) => a[0] - b[0]);
      for (let i = 1; i < sorted.length; i++) expect(sorted[i]![0], parcel.name).toBeGreaterThanOrEqual(sorted[i - 1]![1]);
    }
  });
  it('dates move with the calendar; one crate count is deliberately unreadable and is NOT zero; harvests are never in the future', async () => {
    const db = await load();
    const rows = await db.job_harvest.toArray();
    expect(rows.every((r) => String(r.harvested_at).slice(0, 10) <= TODAY)).toBe(true);
    const unreadable = rows.filter((r) => !parseWhole<'Crates'>(String(r.crates_str)).known);
    expect(unreadable).toHaveLength(1);
    expect(dayAt(TODAY, -48)).toBe('2026-10-09');
    const pl = await db.plantings.toArray();
    expect(pl.find((p) => p.legacy_id === 'pl12')?.status).toBe('planned');          // the planned one is in the future
    expect(String(pl.find((p) => p.legacy_id === 'pl12')?.sown_on) > TODAY).toBe(true);
    const old = Math.min(...pl.map((p) => Date.parse(String(p.sown_on))));
    expect((Date.parse(`${TODAY}T12:00:00Z`) - old) / 86_400_000).toBeLessThanOrEqual(90);
  });
  it('the phone-local season records (cuts, fertilise/irrigate, fictional ΚΑΕΚ 99…) are keyed by the Demo farm only', async () => {
    const db = await load();
    for (const k of ['cuts', 'field_work', 'kaek']) expect(await db.settings.get(`${k}:${DEMO_FARM_ID}`), k).toBeDefined();
    const kaek = (await db.settings.get(`kaek:${DEMO_FARM_ID}`))!.value as Record<string, string>;
    expect(Object.keys(kaek)).toHaveLength(7); for (const v of Object.values(kaek)) expect(v).toMatch(/^99\d{10}$/);
    expect(await db.settings.get(`kaek:${TEST_FARM_ID}`)).toBeUndefined();
  });
});

describe('Demo season sprays and stock (queue item 32b)', () => {
  const NOWMS = Date.parse(`${TODAY}T14:00:00Z`);
  it('nine sprays through the real builder; doses are the label records\' own text; one lot per product with a quantity', async () => {
    const db = await load();
    const sprays = await db.job_spray.toArray();
    expect(sprays).toHaveLength(9);
    const labels = await db.label_uses.toArray();
    for (const s of sprays) { const l = labels.find((x) => x.id === s.label_use_id); expect(l, String(s.id)).toBeDefined(); expect(s.dose_str).toBe(l!.dose_min); expect(s.dose_unit).toBe(l!.dose_unit); }
    expect((await db.workers.where('farm_id').equals(DEMO_FARM_ID).toArray()).map((w) => w.name)).toEqual(expect.arrayContaining(['Νίκος', 'Ελένη', 'Θεόδωρος']));
    expect(await db.stock_lots.count()).toBeGreaterThanOrEqual(14);
  });
  it('hard cases: rocket in its waiting period, re-entry running today, unsigned and incomplete labels have an UNKNOWN waiting period (no date, never 0), the product is used up', async () => {
    const db = await load();
    const all = await db.job_spray.toArray(); const jobs = await db.jobs.toArray();
    const inPhi = all.filter((s) => typeof s.phi_until === 'string' && Date.parse(String(s.phi_until)) > NOWMS);
    expect(inPhi.length).toBeGreaterThanOrEqual(2);                                   // rocket (+2 days) and endive (+39 days)
    const reiRunning = all.filter((s) => typeof s.rei_until === 'string' && Date.parse(String(s.rei_until)) > NOWMS);
    expect(reiRunning.length).toBeGreaterThanOrEqual(1);
    const unknown = all.filter((s) => s.phi_until === undefined);
    expect(unknown.length).toBeGreaterThanOrEqual(2);                                 // unsigned + incomplete label
    for (const s of unknown) { expect(s.phi_days, String(s.id)).toBeUndefined(); expect(['unsigned', 'blocked']).toContain(String(s.label_state)); }
    const empty = all.find((s) => Array.isArray(s.flags) && (s.flags as string[]).includes('stock_negative') === false && s.lot_key);
    expect(empty).toBeDefined();
    const lot = await db.stock_lots.get(String(empty!.lot_key)); const mv = (await db.stock_movements.toArray()).filter((m) => m.lot_key === lot!.lot_key);
    expect(mv.map((m) => `${String(m.direction)}${String(m.qty_str)}`).sort()).toEqual(['in0.1', 'out0.1']);   // received 0,1 L, sprayed 0,1 L: balance exactly 0
    expect(jobs.filter((j) => j.kind === 'spray')).toHaveLength(9);
  });
});
