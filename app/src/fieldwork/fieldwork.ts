import { parseDecimal, parseWhole } from '@aloni/rules-core';
import type { AppDB } from '../db/schema';
import { putLocal } from '../repo';
import type { Day } from '../weather/strip';

// «Λίπανση» and «Άρδευση» RECORDS: what was done on a parcel, typed by the owner (a day, the form of the nitrogen as the package says, the kg of N per στρέμμα, the minutes / m³ of water).
// The app suggests no fertiliser, no quantity and no schedule; it only keeps the record. Kept on this phone per farm: the server tables `job_fertilise` / `job_irrigate` exist but do not sync yet
// (a SQL file, separate). The weather of that day is copied from the stored weather when it is known.
export interface Snapshot { tmin?: number; tmax?: number; rain?: number; wind?: number; gust?: number }
export interface Work {
  id: string; parcel_id: string; kind: 'fertilise' | 'irrigate'; day: string;
  n_form?: string; n_kg_per_str?: string; minutes?: string; m3?: string; weather?: Snapshot;
}
export type WorkInput = Omit<Work, 'id' | 'weather'>;
const key = (farm: string): string => `field_work:${farm}`;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export async function loadWork(db: AppDB, farm: string): Promise<Work[]> {
  return ((await db.settings.get(key(farm)))?.value as Work[] | undefined) ?? [];
}
export async function addWork(db: AppDB, farm: string, input: WorkInput, id: string, today: string, weather?: Snapshot): Promise<Work> {
  if (input.parcel_id === '') throw new Error('no parcel');
  if (!DAY.test(input.day) || !Number.isFinite(Date.parse(`${input.day}T12:00:00Z`)) || input.day > today) throw new Error('bad day');
  const rec: Work = { id, parcel_id: input.parcel_id, kind: input.kind, day: input.day };
  if (input.kind === 'fertilise') {
    const form = (input.n_form ?? '').trim();
    if (form === '') throw new Error('N form is mandatory');
    rec.n_form = form;
    const kg = (input.n_kg_per_str ?? '').trim();
    if (kg !== '') { if (!parseDecimal(kg).known) throw new Error('bad quantity'); rec.n_kg_per_str = kg; }
  } else {
    const minutes = (input.minutes ?? '').trim(); const m3 = (input.m3 ?? '').trim();
    if (minutes === '' && m3 === '') throw new Error('minutes or m3');
    if (minutes !== '') { if (!parseWhole<'Minutes'>(minutes).known) throw new Error('bad minutes'); rec.minutes = minutes; }
    if (m3 !== '') { if (!parseDecimal(m3).known) throw new Error('bad m3'); rec.m3 = m3; }
  }
  if (weather !== undefined) rec.weather = weather;
  await putLocal(db, key(farm), [...(await loadWork(db, farm)), rec]);
  return rec;
}
export async function removeWork(db: AppDB, farm: string, id: string): Promise<void> {
  await putLocal(db, key(farm), (await loadWork(db, farm)).filter((w) => w.id !== id));
}
/** The known values of the stored weather of that day; nothing when the day has none (nothing is invented). */
export function snapshotOf(days: readonly Day[], day: string): Snapshot | undefined {
  const d = days.find((x) => x.date === day);
  if (!d) return undefined;
  const s: Snapshot = {};
  if (d.tmin !== undefined) s.tmin = d.tmin;
  if (d.tmax !== undefined) s.tmax = d.tmax;
  if (d.rain !== undefined) s.rain = d.rain;
  if (d.wind !== undefined) s.wind = d.wind;
  if (d.gust !== undefined) s.gust = d.gust;
  return Object.keys(s).length === 0 ? undefined : s;
}
