import { DEMO_FARM_ID, DEMO_NAMESPACE } from '../config';
import { athensToday } from '../plantings/planting';
import { delLocal, putLocal } from '../repo';
import type { AppDB } from './schema';
import { uuidv5 } from './uuid';

// The two cases the farmers asked about, filled in the Demo farm ONLY (fictional; never in a real farm's data):
//  - parsley: a planting with its harvest pace, a fertiliser plan «as the agronomist wrote it» (placeholder text), and a repeating job;
//  - wild chicory: a field cleared with the shredder two days ago («νέα βλάστηση: ημέρα 2»).
// They are phone-local records (settings keyed by the Demo farm) and go away with the Demo (`clearDemoGuide`).
const KEYS = ['cuts', 'harvest_plan', 'fert_plan', 'recurring', 'kc', 'money'] as const;
const id = (table: string, legacy: string): Promise<string> => uuidv5(`${table}:${legacy}`, DEMO_NAMESPACE);
const DAY_MS = 86_400_000;
const shift = (today: string, days: number): string => new Date(Date.parse(`${today}T12:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

export async function seedDemoGuide(db: AppDB): Promise<void> {
  const today = athensToday(new Date()) ?? '1970-01-01';
  const farm = DEMO_FARM_ID;
  const [chicoryParcel, parsleyCrop, parsleyPlanting] = await Promise.all([id('parcels', 'P1'), id('crops', 'parsley'), id('plantings', 'PL07')]);
  await putLocal(db, `cuts:${farm}`, [{ id: 'demo-cut-1', parcel_id: chicoryParcel, day: shift(today, -2), method: 'shredder' }]);
  await putLocal(db, `harvest_plan:${farm}`, { [parsleyCrop]: { crates: '54', end: shift(today, 18) } });
  await putLocal(db, `fert_plan:${farm}`, { [parsleyPlanting]: { items: [
    { id: 'demo-fert-1', day: '20', text: 'Κείμενο επίδειξης – το γράφει ο γεωπόνος' },
    { id: 'demo-fert-2', day: '35', text: 'Κείμενο επίδειξης – το γράφει ο γεωπόνος' },
  ] } });
  const at = `${today}T06:00:00.000Z`;          // «Ταμείο»: fictional amounts, Demo farm only
  await putLocal(db, `money:${farm}`, [
    { id: 'demo-money-1', day: shift(today, -20), dir: 'out', category: 'seed', cents: 18500, crop: 'spinach', note: 'Κείμενο επίδειξης', at },
    { id: 'demo-money-2', day: shift(today, -12), dir: 'out', category: 'fuel', cents: 6240, note: '', at },
    { id: 'demo-money-3', day: shift(today, -9), dir: 'out', category: 'labour', cents: 15000, note: '', at },
    { id: 'demo-money-4', day: shift(today, -5), dir: 'in', category: 'sale', cents: 48000, crop: 'spinach', note: 'Κείμενο επίδειξης', at },
    { id: 'demo-money-5', day: shift(today, -2), dir: 'in', category: 'sale', cents: 21000, crop: 'rocket', note: '', at },
  ]);
  await putLocal(db, `recurring:${farm}`, [
    { id: 'demo-rec-1', weekday: 1, title: 'Έλεγχος χωραφιού', scope: 'all' },
    { id: 'demo-rec-2', weekday: 5, title: 'Καθαρισμός αποθήκης', scope: 'all' },
  ]);
}

export async function clearDemoGuide(db: AppDB): Promise<void> {
  for (const k of KEYS) await delLocal(db, `${k}:${DEMO_FARM_ID}`);
}
