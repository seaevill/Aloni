import { parseWhole } from '@aloni/rules-core';
import type { Row } from '../db/schema';

// The owner-only records of SQL 0037 (worker card, customer, customer order): the rows the phone writes once the server has the tables. Owner only: no worker screen reads or writes them, and the server refuses a worker.
// Nothing is guessed: a blank name, a crate count that is not a whole number above 0, or a day that does not exist is refused. No date of birth anywhere (Bora's decision).
export type Built = { ok: true; row: Row } | { ok: false; reason: string };
const blank = (v: string | undefined): boolean => v === undefined || v.trim() === '';
const isDay = (v: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(`${v}T12:00:00Z`).toISOString().slice(0, 10) === v;

export function buildCustomer(input: { name: string; phone?: string; note?: string }, farmId: string, nowIso: string, id: string): Built {
  if (blank(input.name)) return { ok: false, reason: 'name' };
  if ((input.note ?? '').length > 2000) return { ok: false, reason: 'note' };
  return { ok: true, row: { id, farm_id: farmId, name: input.name.trim(), ...(blank(input.phone) ? {} : { phone: input.phone!.trim() }), ...(blank(input.note) ? {} : { note: input.note!.trim() }), created_at: nowIso, updated_at: nowIso, deleted_at: null } };
}

export function buildWorkerCard(input: { workerId: string; surname?: string; phone?: string }, farmId: string, nowIso: string, id: string): Built {
  if (blank(input.workerId)) return { ok: false, reason: 'worker' };
  return { ok: true, row: { id, farm_id: farmId, worker_id: input.workerId, ...(blank(input.surname) ? {} : { surname: input.surname!.trim() }), ...(blank(input.phone) ? {} : { phone: input.phone!.trim() }), created_at: nowIso, updated_at: nowIso, deleted_at: null } };
}

export function buildCustomerOrder(input: { customerId: string; cropId: string; crates: string; day: string; note?: string }, farmId: string, nowIso: string, id: string): Built {
  const n = parseWhole<'Crates'>(input.crates.trim());
  if (!n.known || n.value < 1 || n.value > 999999) return { ok: false, reason: 'crates' };
  if (!isDay(input.day)) return { ok: false, reason: 'day' };
  if (blank(input.customerId) || blank(input.cropId)) return { ok: false, reason: 'reference' };
  return { ok: true, row: { id, farm_id: farmId, customer_id: input.customerId, crop_id: input.cropId, crates_str: String(n.value), for_day: input.day, status: 'open', ...(blank(input.note) ? {} : { note: input.note!.trim() }), created_at: nowIso, updated_at: nowIso, deleted_at: null } };
}

/** The season target of SQL 0041: INSERT-ONLY (a change is a NEW row; the newest row of a crop wins). A whole number of crates above 0 and a real start day; nothing is guessed. */
export function buildCropTarget(input: { cropId: string; crates: string; since: string }, farmId: string, nowIso: string, id: string): Built {
  const n = parseWhole<'Crates'>(input.crates.trim());
  if (!n.known || n.value < 1 || n.value > 1_000_000) return { ok: false, reason: 'crates' };
  if (!isDay(input.since)) return { ok: false, reason: 'since' };
  if (blank(input.cropId)) return { ok: false, reason: 'reference' };
  return { ok: true, row: { id, farm_id: farmId, crop_id: input.cropId, season_start: input.since, target_crates: n.value, created_at: nowIso, updated_at: nowIso, deleted_at: null } };
}

/** A note for a day (SQL 0039): text 1–280 characters, a real day. `from_worker` is NEVER sent: the server sets it from the writer's role. */
export function buildDayNote(input: { day: string; text: string }, farmId: string, nowIso: string, id: string): Built {
  const text = input.text.trim();
  if (text === '' || text.length > 280) return { ok: false, reason: 'text' };
  if (!isDay(input.day)) return { ok: false, reason: 'day' };
  return { ok: true, row: { id, farm_id: farmId, for_day: input.day, text, status: 'open', created_at: nowIso, updated_at: nowIso, deleted_at: null } };
}
