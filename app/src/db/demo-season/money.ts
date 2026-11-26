import { DEMO_FARM_ID, DEMO_NAMESPACE } from '../../config';
import { buildObservation, type ObservationKind } from '../../worker/jobs';
import { appendMoney, buildEntry, voidOf, type MoneyEntry } from '../../money/ledger';
import type { AppDB, Row } from '../schema';
import { uuidv5 } from '../uuid';
import { dayAt } from './dates';

// Demo season (queue item 32d): the Ταμείο book (income and expenses in whole euro CENTS, a correction and a cancel as NEW rows, one «Επιστροφή ΦΠΑ» income line — only a label, no VAT calculation anywhere) and the field observations.
// FICTIONAL, Demo farm only. Every entry goes through the real builder, so what the book shows is what a typed entry would show.
const u = (kind: string, key: string): Promise<string> => uuidv5(`season:${kind}:${key}`, DEMO_NAMESPACE);
interface Def { id: string; day: number; dir: 'in' | 'out'; category: string; amount: string; crop?: string; note?: string }
const DEFS: readonly Def[] = [
  { id: 'm1', day: -86, dir: 'out', category: 'seed', amount: '320,50', crop: 'parsley' }, { id: 'm2', day: -80, dir: 'out', category: 'fertiliser', amount: '412' },
  { id: 'm3', day: -74, dir: 'out', category: 'rent', amount: '600' }, { id: 'm4', day: -70, dir: 'out', category: 'labour', amount: '480,25' },
  { id: 'm5', day: -65, dir: 'out', category: 'fuel', amount: '88,40' }, { id: 'm6', day: -60, dir: 'out', category: 'water', amount: '135,10' },
  { id: 'm7', day: -55, dir: 'in', category: 'sale', amount: '540', crop: 'parsley' }, { id: 'm8', day: -50, dir: 'out', category: 'packaging', amount: '96,80' },
  { id: 'm9', day: -45, dir: 'in', category: 'sale', amount: '720,50', crop: 'leek' }, { id: 'm10', day: -41, dir: 'out', category: 'seed', amount: '210,90', crop: 'spinach' },
  { id: 'm11', day: -38, dir: 'out', category: 'ppp', amount: '154,30' }, { id: 'm12', day: -33, dir: 'in', category: 'sale', amount: '615', crop: 'parsley' },
  { id: 'm13', day: -30, dir: 'out', category: 'labour', amount: '510' }, { id: 'm14', day: -27, dir: 'out', category: 'repair', amount: '175,60' },
  { id: 'm15', day: -24, dir: 'in', category: 'sale', amount: '480', crop: 'chicory' }, { id: 'm16', day: -20, dir: 'in', category: 'vat_refund', amount: '230,45', note: 'Επίδειξη' },
  { id: 'm17', day: -18, dir: 'out', category: 'transport', amount: '64,20' }, { id: 'm18', day: -15, dir: 'in', category: 'sale', amount: '832,75', crop: 'spinach' },
  { id: 'm19', day: -12, dir: 'out', category: 'power', amount: '118,35' }, { id: 'm20', day: -9, dir: 'in', category: 'sale', amount: '455', crop: 'rocket' },
  { id: 'm21', day: -7, dir: 'out', category: 'labour', amount: '505,50' }, { id: 'm22', day: -5, dir: 'in', category: 'sale', amount: '690,25', crop: 'chicory' },
  { id: 'm23', day: -3, dir: 'out', category: 'fuel', amount: '71,90' }, { id: 'm24', day: -2, dir: 'in', category: 'sale', amount: '560', crop: 'spinach' },
  { id: 'm25', day: -1, dir: 'out', category: 'equipment', amount: '249' },
];
const OBS: ReadonlyArray<{ id: string; parcel: string; day: number; kind: ObservationKind; note: string }> = [
  { id: 'o1', parcel: 'S1', day: -14, kind: 'pest', note: 'Αφίδες στις παρυφές' }, { id: 'o2', parcel: 'S3', day: -9, kind: 'dew', note: 'Πολλή πρωινή δροσιά' },
  { id: 'o3', parcel: 'S2', day: -6, kind: 'disease', note: 'Κηλίδες σε λίγα φύλλα' }, { id: 'o4', parcel: 'S5', day: -4, kind: 'frost_damage', note: 'Ελαφρύ κάψιμο στις άκρες' },
  { id: 'o5', parcel: 'S4', day: -2, kind: 'other', note: 'Νερό στάζει από το σωλήνα' },
];

/** The ledger rows of the season, built by the real builders (a correction row and a cancel row included, nothing edited or removed). */
export async function moneyEntries(today: string): Promise<MoneyEntry[]> {
  const rows: MoneyEntry[] = [];
  for (const d of DEFS) {
    const r = buildEntry({ day: dayAt(today, d.day), dir: d.dir, category: d.category, amount: d.amount, ...(d.crop ? { crop: d.crop } : {}), note: d.note ?? '' }, await u('money', d.id), `${dayAt(today, d.day)}T09:00:00.000Z`);
    if (!r.ok) throw new Error(`demo season: money entry ${d.id} refused (${r.reason})`);
    rows.push(r.entry);
  }
  const fix = buildEntry({ day: dayAt(today, -33), dir: 'in', category: 'sale', amount: '645', crop: 'parsley', note: 'Διόρθωση ποσού' }, await u('money', 'm12-fix'), `${dayAt(today, -32)}T09:00:00.000Z`, rows.find((r) => r.id === rows[11]!.id)!.id);
  if (!fix.ok) throw new Error('demo season: the correction row was refused');
  rows.push(fix.entry);
  rows.push(voidOf(rows[16]!, await u('money', 'm17-void'), `${dayAt(today, -17)}T09:00:00.000Z`));                  // m17 (transport) cancelled
  return rows;
}
export async function seedMoney(db: AppDB, today: string): Promise<void> {
  for (const e of await moneyEntries(today)) await appendMoney(db, DEMO_FARM_ID, e);
}
export async function observationRows(today: string, parcelId: (legacy: string) => string, worker: Row): Promise<Row[]> {
  const out: Row[] = [];
  for (const o of OBS) { const r = buildObservation(parcelId(o.parcel), o.kind, o.note, worker, DEMO_FARM_ID, `${dayAt(today, o.day)}T08:30:00.000Z`, await u('obs', o.id)); if (r) out.push(r); }
  return out;
}
