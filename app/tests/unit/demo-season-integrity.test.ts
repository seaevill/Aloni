import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import raw from '../../../reference/prototype/data.json';
import { DEMO_FARM_ID } from '../../src/config';
import { clearDemoGuide } from '../../src/db/demo-guide';
import { applySeason } from '../../src/db/demo-season/load';
import { importDemo, removeDemo, type PrototypeData } from '../../src/db/import-demo';
import { FARM_TABLES } from '../../src/db/schema';
import { supplyByCrop } from '../../src/orders/available';
import { cutTodayBySlug, tomorrowBoard } from '../../src/orders/tomorrow';
import type { KlouvesOrders } from '../../src/orders/klouves';
import { putLocal, putSetting } from '../../src/repo';
import { mapKey, ordersKey } from '../../src/orders/store';
import { newDb, putParcel, TEST_FARM_ID } from '../helpers/factories';

// QUEUE item 34 — integrity of the Demo season (a)–(g). TODAY is fixed; "now" is noon Athens of that day.
const TODAY = '2026-11-26'; const NOW = `${TODAY}T10:00:00.000Z`;
const load = async () => { const db = await newDb(); await importDemo(db, raw as unknown as PrototypeData); await applySeason(db, TODAY); return db; };
const classic = async (db: Awaited<ReturnType<typeof newDb>>) => { await removeDemo(db); await importDemo(db, raw as unknown as PrototypeData); await clearDemoGuide(db); };

describe('Demo season integrity (queue item 34)', () => {
  it('(a) a real farm on the same phone keeps every row and setting; no Demo row carries the real farm id', async () => {
    const db = await newDb();
    const real = await putParcel(db, { name: 'Real parcel' }, TEST_FARM_ID);
    await putSetting(db, TEST_FARM_ID, 'controller', { name: 'Real person' }); await putLocal(db, `customers:${TEST_FARM_ID}`, [{ id: 'own:real', name: 'Real client', phone: '1', note: '' }]);
    await importDemo(db, raw as unknown as PrototypeData); await applySeason(db, TODAY);
    expect((await db.parcels.get(String(real.id)))?.name).toBe('Real parcel');
    expect((await db.settings.get(`customers:${TEST_FARM_ID}`))?.value).toEqual([{ id: 'own:real', name: 'Real client', phone: '1', note: '' }]);
    for (const t of FARM_TABLES) for (const r of await db[t].toArray()) expect(r.farm_id === TEST_FARM_ID ? String(r.id) : DEMO_FARM_ID, t).toBe(r.farm_id === TEST_FARM_ID ? String(real.id) : r.farm_id);
    expect((await db.settings.toArray()).filter((s) => s.key.endsWith(`:${TEST_FARM_ID}`) || s.key.includes(`:${TEST_FARM_ID}:`)).length).toBe(1);   // only the real customers key
  });
  it('(b) plantings in a waiting period are HELD, never supply: rocket has nothing to cut and the «Αύριο φεύγουν» gap row says so', async () => {
    const db = await load();
    const [crops, plantings, links, sprays, harvests, labels] = await Promise.all([db.crops.toArray(), db.plantings.toArray(), db.job_plantings.toArray(), db.job_spray.toArray(), db.job_harvest.toArray(), db.label_uses.toArray()]);
    const supply = supplyByCrop(NOW, crops, plantings, links, sprays, harvests, labels);
    expect(supply.rocket).toMatchObject({ free: 0 }); expect(supply.rocket!.held + supply.rocket!.unknown).toBeGreaterThanOrEqual(2);   // pl5 in PHI, pl11 unsigned label
    expect(supply.spinach!.held).toBeGreaterThanOrEqual(1);                                                                              // pl7 sprayed today, PHI 14 days
    const orders = (await db.settings.get(ordersKey(DEMO_FARM_ID)))!.value as KlouvesOrders; const map = (await db.settings.get(mapKey(DEMO_FARM_ID)))!.value as Record<string, string>;
    const board = tomorrowBoard(orders, map, supply, cutTodayBySlug(TODAY, harvests, plantings, crops), '2026-11-27');
    const rocket = board.rows.find((r) => r.slug === 'rocket'); expect(rocket?.state).toBe('missing'); expect(rocket?.free).toBe(0);
  });
  it('(c) every dose is the label record\'s own text, and every label record\'s dose is the sample product file\'s text one to one (nothing rounded, nothing converted)', async () => {
    const db = await load();
    const proto = (raw as unknown as { products: Array<{ id: string; registered?: Array<{ crop_id: string; dose_per_str: number; phi_days: number | null; rei_h: number }> }> }).products;
    const products = await db.products.toArray(); const crops = await db.crops.toArray();
    for (const l of await db.label_uses.toArray()) {
      const p = products.find((x) => x.id === l.product_id)!; const c = crops.find((x) => x.id === l.crop_id)!;
      const reg = proto.find((x) => x.id === p.legacy_id)!.registered!.find((r) => r.crop_id === c.slug)!;
      expect(l.dose_min, `${p.legacy_id}/${c.slug}`).toBe(String(reg.dose_per_str));
    }
    const labels = await db.label_uses.toArray();
    for (const s of await db.job_spray.toArray()) expect(s.dose_str, String(s.id)).toBe(labels.find((l) => l.id === s.label_use_id)!.dose_min);
    for (const j of (await db.jobs.toArray()).filter((x) => x.status === 'planned')) expect(j.dose_str).toBe(labels.find((l) => l.id === j.label_use_id)!.dose_min);
  });
  it('(d) unknown stays unknown: an unreadable crate count is not counted as 0 or as a number, an unsigned or incomplete label gives no waiting-period date', async () => {
    const db = await load();
    const [crops, plantings, links, sprays, harvests, labels] = await Promise.all([db.crops.toArray(), db.plantings.toArray(), db.job_plantings.toArray(), db.job_spray.toArray(), db.job_harvest.toArray(), db.label_uses.toArray()]);
    const unreadable = harvests.filter((h) => String(h.crates_str) === 'δεκαπέντε'); expect(unreadable).toHaveLength(1);
    const withIt = supplyByCrop(NOW, crops, plantings, links, sprays, harvests, labels).rocket!.cut7;
    const without = supplyByCrop(NOW, crops, plantings, links, sprays, harvests.filter((h) => h !== unreadable[0]), labels).rocket!.cut7;
    expect(withIt).toBe(without);                                                                              // not added as 0, not guessed as 15
    for (const s of sprays.filter((x) => x.label_state !== 'signed')) { expect(s.phi_until, String(s.id)).toBeUndefined(); expect(s.rei_until).toBeUndefined(); }
  });
  it('(f) removing the Demo removes every season row and every phone-local season record', async () => {
    const db = await load();
    await removeDemo(db); await clearDemoGuide(db);
    for (const t of FARM_TABLES) expect(await db[t].where('farm_id').equals(DEMO_FARM_ID).count(), t).toBe(0);
    expect(await db.weather.where('farm_id').equals(DEMO_FARM_ID).count()).toBe(0);
    expect((await db.settings.toArray()).filter((s) => s.key.includes(DEMO_FARM_ID))).toEqual([]);
  });
  it('(g) the classic Demo loaded after the season has the classic data only (five parcels, no season record anywhere), and the other way round', async () => {
    const db = await load();
    await classic(db);
    expect(await db.parcels.where('farm_id').equals(DEMO_FARM_ID).count()).toBe(5);
    expect((await db.parcels.toArray()).some((p) => String(p.legacy_id).startsWith('S'))).toBe(false);
    for (const k of ['customers', 'kaek', 'tomorrow_notes', 'field_work', 'demo_season']) expect(await db.settings.get(`${k}:${DEMO_FARM_ID}`), k).toBeUndefined();
    await applySeason(db, TODAY);                                                                               // and the season on top of the classic one: no classic parcel left
    expect((await db.parcels.where('farm_id').equals(DEMO_FARM_ID).toArray()).map((p) => String(p.legacy_id)).sort()).toEqual(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7']);
    expect((await db.plantings.toArray()).every((p) => String(p.legacy_id).startsWith('pl'))).toBe(true);
  });
});

describe('Demo season on any day of the year (queue item 34h)', () => {
  it('loads on DST change days, the leap day, year ends and mid-season dates: the builders never refuse, every day is real, nothing lies in the future except the planned work', async () => {
    for (const day of ['2026-03-29', '2026-10-25', '2027-01-01', '2027-12-31', '2028-02-29', '2028-03-01', '2026-07-14']) {
      const db = await newDb(); await importDemo(db, raw as unknown as PrototypeData); await applySeason(db, day);
      expect(await db.parcels.where('farm_id').equals(DEMO_FARM_ID).count(), day).toBe(7);
      for (const h of await db.job_harvest.toArray()) expect(String(h.harvested_at).slice(0, 10) <= day, `${day} harvest`).toBe(true);
      for (const s of await db.job_spray.toArray()) expect(String(s.sprayed_at).slice(0, 10) <= day, `${day} spray`).toBe(true);
      expect((await db.jobs.toArray()).filter((j) => j.status === 'planned' && String(j.planned_for) > day).length, `${day} planned in the future`).toBe(4);
    }
  });
});
