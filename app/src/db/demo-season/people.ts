import { DEMO_FARM_ID, DEMO_NAMESPACE } from '../../config';
import { mondayOf, type KlouvesOrders } from '../../orders/klouves';
import { ordersKey, mapKey } from '../../orders/store';
import { putLocal } from '../../repo';
import type { AppDB, Row } from '../schema';
import { uuidv5 } from '../uuid';
import { dayAt } from './dates';
import { SEASON_WORKERS } from './data';

// Demo season (queue item 32c): everything the OWNER keeps about people and plans, FICTIONAL, Demo farm only (phone-local settings keyed by the Demo farm). Names are generic («Πελάτης Α»), phones are in the
// reserved +30 690 000 xxxx style, workers have a first name and a surname and a phone, NO date of birth. Nothing here is a real person or business.
const u = (kind: string, key: string): Promise<string> => uuidv5(`season:${kind}:${key}`, DEMO_NAMESPACE);
const CLIENTS = ['Α', 'Β', 'Γ', 'Δ', 'Ε', 'ΣΤ'];
const SURNAMES = ['Αντωνίου', 'Βασιλείου', 'Γεωργίου'] as const;
// crates per client per product (spinach d-sp, rocket d-ro, parsley d-pa, endive d-en, dill d-di): quarters only, as the Κλούβες app writes them
const BASE: ReadonlyArray<Record<string, number>> = [{ 'd-sp': 8, 'd-ro': 2.5 }, { 'd-sp': 4, 'd-pa': 4 }, { 'd-ro': 6, 'd-pa': 3 }, { 'd-sp': 5, 'd-en': 2 }, { 'd-pa': 5, 'd-di': 1.5 }, { 'd-sp': 3, 'd-ro': 2, 'd-pa': 2 }];

/** The orders of the season: every weekday of the last four weeks and tomorrow, six clients. ONE deliberate gap: yesterday more spinach was ordered than was harvested (the open gap). */
export function seasonOrders(today: string): { orders: KlouvesOrders; map: Record<string, string>; ids: string[] } {
  const ids = CLIENTS.map((c) => `own:season-${c}`);
  const days: NonNullable<KlouvesOrders['days']> = {};
  for (let off = -27; off <= 1; off++) {
    const day = dayAt(today, off); const wd = new Date(`${day}T12:00:00Z`).getUTCDay();
    if (wd === 0) continue;                                                          // no deliveries on Sunday
    const perClient: Record<string, Record<string, number>> = {};
    BASE.forEach((b, i) => { if ((i + off) % 3 !== 2 || off >= -1) perClient[ids[i]!] = { ...b }; });
    days[day] = perClient;
  }
  days[dayAt(today, -1)] = { [ids[0]!]: { 'd-sp': 18 }, [ids[1]!]: { 'd-sp': 14 }, [ids[2]!]: { 'd-ro': 6 } };            // spinach ordered 32 crates; 24 were harvested (h11): the gap shows
  const weeks: Record<string, Record<string, number>> = {};
  for (const [day, byClient] of Object.entries(days)) { const w = (weeks[mondayOf(day) ?? day] ??= {}); for (const q of Object.values(byClient)) for (const [p, n] of Object.entries(q)) { const before = w[p]; if (before === undefined) w[p] = n; else w[p] = before + n; } }
  return { orders: { products: [{ id: 'd-sp', name: 'Σπανάκι' }, { id: 'd-ro', name: 'Ρόκα' }, { id: 'd-pa', name: 'Μαϊντανός' }, { id: 'd-en', name: 'Αντίδια' }, { id: 'd-di', name: 'Άνηθος' }], weeks, skipped: 0, days, clients: ids.map((id, i) => ({ id, name: `Πελάτης ${CLIENTS[i]}` })) }, map: { 'd-sp': 'spinach', 'd-ro': 'rocket', 'd-pa': 'parsley', 'd-en': 'endive', 'd-di': 'dill' }, ids };
}

export async function seedPeople(db: AppDB, today: string, plantings: readonly Row[], workerIds: readonly string[]): Promise<void> {
  const farm = DEMO_FARM_ID;
  const o = seasonOrders(today);
  await putLocal(db, ordersKey(farm), o.orders); await putLocal(db, mapKey(farm), o.map);
  await putLocal(db, `customers:${farm}`, o.ids.map((id, i) => ({ id, name: `Πελάτης ${CLIENTS[i]}`, phone: `+30 690 000 ${String(1001 + i)}`, note: 'Επίδειξη – φανταστικός πελάτης' })));
  for (let i = 0; i < workerIds.length; i++) await putLocal(db, `worker_card:${farm}:${workerIds[i]}`, { surname: SURNAMES[i], phone: `+30 690 000 ${String(2001 + i)}` });
  const tomorrow = dayAt(today, 1);
  await putLocal(db, `tomorrow_notes:${farm}`, [
    { id: await u('note', 'n1'), day: tomorrow, text: 'Να φέρουμε κλούβες για τη φόρτωση', byWorker: true },
    { id: await u('note', 'n2'), day: tomorrow, text: 'Έλεγχος της άρδευσης στο Λάκκα', byWorker: false },
    { id: await u('note', 'n3'), day: dayAt(today, 2), text: 'Παραλαβή υλικών από την αποθήκη', byWorker: false },
  ]);
  await putLocal(db, `recurring:${farm}`, [{ id: await u('rec', 'r1'), weekday: 1, title: 'Έλεγχος χωραφιών', scope: 'all' }, { id: await u('rec', 'r2'), weekday: 5, title: 'Καθαρισμός αποθήκης', scope: 'all' }, { id: await u('rec', 'r3'), weekday: 3, title: 'Έλεγχος σταγονοσωλήνων', scope: 'all' }]);
  const pl = (legacy: string) => String(plantings.find((p) => p.legacy_id === legacy)?.id);
  const cropOf = (legacy: string) => String(plantings.find((p) => p.legacy_id === legacy)?.crop_id);
  for (const [legacy, crates] of [['pl1', '400'], ['pl3', '300'], ['pl5', '250']] as const) await putLocal(db, `season_target:${farm}:${cropOf(legacy)}`, { crates, since: dayAt(today, -90) });
  await putLocal(db, `harvest_plan:${farm}`, { [cropOf('pl3')]: { crates: '120', end: dayAt(today, 20) }, [cropOf('pl1')]: { crates: '60', end: dayAt(today, 12) } });
  await putLocal(db, `fert_plan:${farm}`, { [pl('pl3')]: { items: [{ id: await u('fert', 'f1'), day: '20', text: 'Κείμενο επίδειξης – το γράφει ο γεωπόνος' }, { id: await u('fert', 'f2'), day: '35', text: 'Κείμενο επίδειξης – το γράφει ο γεωπόνος' }] }, [pl('pl1')]: { items: [{ id: await u('fert', 'f3'), day: '15', text: 'Κείμενο επίδειξης – το γράφει ο γεωπόνος' }] } });
}

/** The job board and two late jobs: open (nobody yet), taken, and overdue. Same fields the classic Demo uses; dose and unit = the label record's own text. */
export async function boardRows(today: string, products: readonly Row[], labels: readonly Row[], plantings: readonly Row[], workerIds: readonly string[]): Promise<{ jobs: Row[]; job_plantings: Row[] }> {
  const NOW = `${today}T06:00:00.000Z`;
  const defs: ReadonlyArray<{ id: string; planting: string; product: string; day: number; worker?: number }> = [
    { id: 'b1', planting: 'pl11', product: 'PR09', day: 1 }, { id: 'b2', planting: 'pl2', product: 'PR06', day: 3 },                                      // open: nobody has taken them
    { id: 'b3', planting: 'pl1', product: 'PR09', day: 2, worker: 1 }, { id: 'b4', planting: 'pl6', product: 'PR06', day: 1, worker: 2 },                // taken
    { id: 'b5', planting: 'pl3', product: 'PR09', day: -2, worker: 0 }, { id: 'b6', planting: 'pl8', product: 'PR02', day: -5, worker: 1 },              // overdue
  ];
  const out: { jobs: Row[]; job_plantings: Row[] } = { jobs: [], job_plantings: [] };
  for (const d of defs) {
    const product = products.find((p) => p.legacy_id === d.product); const planting = plantings.find((p) => p.legacy_id === d.planting);
    const label = labels.find((l) => l.product_id === product?.id && l.crop_id === planting?.crop_id);
    if (!product || !planting || !label?.sign_off) throw new Error(`demo season: board job ${d.id} needs a signed label of ${d.product} on ${d.planting}`);
    const id = await u('board', d.id);
    out.jobs.push({ id, farm_id: DEMO_FARM_ID, kind: 'spray', status: 'planned', product_id: product.id, label_use_id: label.id, ...(d.worker === undefined ? {} : { worker_id: workerIds[d.worker] }), planned_for: dayAt(today, d.day), dose_str: label.dose_min, dose_unit: label.dose_unit, created_at: NOW, updated_at: NOW, deleted_at: null });
    out.job_plantings.push({ id: await u('board-jp', d.id), farm_id: DEMO_FARM_ID, job_id: id, planting_id: planting.id, area_str_treated: planting.area_str, created_at: NOW });
  }
  return out;
}
export const seasonWorkerNames = SEASON_WORKERS;
