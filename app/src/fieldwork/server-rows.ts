import type { Row } from '../db/schema';

// The server rows of SQL 0042 (OWNER ONLY, never edited: a record is only ever tombstoned). Nothing is guessed: what the server would refuse is refused here first, in the same words as the other records.
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const real = (d: string): boolean => DAY.test(d) && new Date(`${d}T12:00:00Z`).toISOString().slice(0, 10) === d && d >= '2000-01-01' && d <= '2100-01-01';
const DEC = /^[0-9]{1,6}([.,][0-9]{1,6})?$/; const MIN = /^[0-9]{1,5}$/; const NONZERO = /[1-9]/;
export const METHODS = ['shredder', 'hand', 'other'] as const;

export function cutRow(input: { parcel_id: string; day: string; method: string }, farm: string, id: string, nowIso: string): Row {
  if (input.parcel_id === '') throw new Error('no parcel');
  if (!real(input.day)) throw new Error('bad day');
  if (!(METHODS as readonly string[]).includes(input.method)) throw new Error('bad method');
  return { id, farm_id: farm, parcel_id: input.parcel_id, day: input.day, method: input.method, created_at: nowIso, updated_at: nowIso, deleted_at: null };
}

export interface WorkFields { parcel_id: string; kind: 'fertilise' | 'irrigate'; day: string; n_form?: string; n_kg_per_str?: string; minutes?: string; m3?: string }
export function workRow(input: WorkFields, farm: string, id: string, nowIso: string, weather?: object): Row {
  if (input.parcel_id === '') throw new Error('no parcel');
  if (!real(input.day)) throw new Error('bad day');
  const row: Row = { id, farm_id: farm, parcel_id: input.parcel_id, kind: input.kind, day: input.day, created_at: nowIso, updated_at: nowIso, deleted_at: null };
  const kg = (input.n_kg_per_str ?? '').trim(); const minutes = (input.minutes ?? '').trim(); const m3 = (input.m3 ?? '').trim();
  if (input.kind === 'fertilise') {
    const form = (input.n_form ?? '').trim();
    if (form === '' || form.length > 120) throw new Error('N form is mandatory');
    row.n_form = form;
    if (kg !== '') { if (!DEC.test(kg) || !NONZERO.test(kg)) throw new Error('bad quantity'); row.n_kg_per_str = kg; }
  } else {
    if (minutes === '' && m3 === '') throw new Error('minutes or m3');
    if (minutes !== '') { if (!MIN.test(minutes) || !NONZERO.test(minutes)) throw new Error('bad minutes'); row.minutes_str = minutes; }
    if (m3 !== '') { if (!DEC.test(m3) || !NONZERO.test(m3)) throw new Error('bad m3'); row.m3_str = m3; }
  }
  if (weather !== undefined) { if (JSON.stringify(weather).length > 500) throw new Error('weather too long'); row.weather = weather; }
  return row;
}
