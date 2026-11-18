import { parseInstant, parseWhole, parsePhiDays, parseReiHours, phiEnd, reiEnd, waitOver } from '@aloni/rules-core';
import type { Row } from '../db/schema';
import { NOT_ON_LABEL } from '../labels/label-use';
import { effectiveSprays } from './spray';

// Harvest is allowed only when EVERY spray on the planting has a KNOWN waiting period that has run out. An unknown waiting period blocks (until Bora
// enters the label's value as an amending row). There is no override and no button that lifts the block by hand.

export type Source = 'label' | 'manual';
export type Gate = { ok: true } | { ok: false; reason: 'unknown' | 'running' | 'time'; until?: string; source?: Source };

/** Can this planting be harvested at `at` (a UTC second)? Recomputed from the stored PHI days and spray time through phiEnd, never from a stored end. */
export function harvestGate(plantingId: string, at: string, links: readonly Row[], sprayRows: readonly Row[]): Gate {
  if (!parseInstant(at).known) return { ok: false, reason: 'time' };
  const jobs = new Set(links.filter((l) => l.planting_id === plantingId).map((l) => l.job_id));
  let until: string | undefined;
  let source: Source | undefined;
  for (const sp of effectiveSprays(sprayRows).filter((r) => jobs.has(r.job_id))) {
    const days = typeof sp.phi_days === 'string' && sp.phi_days !== NOT_ON_LABEL ? parsePhiDays(sp.phi_days) : parsePhiDays('');
    const end = phiEnd(String(sp.sprayed_at), days);
    if (!end.known) return { ok: false, reason: 'unknown' };
    if (!waitOver(at, end) && (until === undefined || end.value > until)) { until = end.value; source = sp.phi_source === 'manual' ? 'manual' : 'label'; } // ISO seconds sort like time; the LATEST end names its source
  }
  return until === undefined ? { ok: true } : { ok: false, reason: 'running', until, source };
}

export interface HarvestInput { plantingId: string; crates: string; harvestedAt: string; note: string }
export type HarvestResult = { ok: true; row: Row } | { ok: false; planting: boolean; crates: boolean; time: boolean; gate: Gate | undefined };

/** The clock's ISO time has milliseconds; the waiting-period logic reads whole UTC seconds. An unreadable «now» stays unreadable (and so blocks). */
const wholeSeconds = (iso: string): string => iso.replace(/\.\d+Z$/, 'Z');

/**
 * The gate is checked at NOW (the phone's clock), never at the typed harvest time: a time in the future cannot be used to step over a waiting period, and a
 * harvest time later than now is refused outright. A past time is a record of what already happened.
 */
export function buildHarvest(input: HarvestInput, links: readonly Row[], sprayRows: readonly Row[], farmId: string, nowIso: string, id: string): HarvestResult {
  const crates = parseWhole<'Crates'>(input.crates);
  const now = wholeSeconds(nowIso);
  const bad = { planting: !input.plantingId, crates: !crates.known || crates.value < 1, time: !parseInstant(input.harvestedAt).known || input.harvestedAt > now };
  const gate = input.plantingId ? harvestGate(input.plantingId, now, links, sprayRows) : undefined;
  if (bad.planting || bad.crates || bad.time || !gate?.ok) return { ok: false, ...bad, gate: gate?.ok ? undefined : gate };
  return { ok: true, row: { id, farm_id: farmId, planting_id: input.plantingId, crates_str: input.crates.trim(), harvested_at: input.harvestedAt, created_at: nowIso, ...(input.note.trim() ? { note: input.note.trim() } : {}) } };
}

export type Cut = { state: 'free' } | { state: 'unknown' } | { state: 'from'; at: string; source: Source };

/**
 * «Κοπή από …» for a parcel, from the waiting periods of ALL its plantings: one unknown waiting period makes the whole parcel «unknown» (blocked); otherwise
 * the LATEST end; with nothing running (or nothing sprayed) it is free. It uses only the stored label values (signed, or Bora's own entry): never a default.
 */
export function cutFromParcel(parcelId: string, now: string, plantings: readonly Row[], links: readonly Row[], sprayRows: readonly Row[]): Cut {
  let latest: string | undefined;
  let source: Source = 'label';
  for (const p of plantings.filter((x) => x.parcel_id === parcelId && !x.deleted_at)) {
    const g = harvestGate(p.id, now, links, sprayRows);
    if (g.ok) continue;
    if (g.reason !== 'running') return { state: 'unknown' }; // unknown waiting period or unreadable time
    if (g.until && (latest === undefined || g.until > latest)) { latest = g.until; source = g.source ?? 'label'; }
  }
  return latest === undefined ? { state: 'free' } : { state: 'from', at: latest, source };
}

/** Re-entry lock for a field: the LATEST running re-entry end among its sprays (from the END of the spraying), or «unknown» when a spray there has no known REI. */
export type Lock = { state: 'none' } | { state: 'running'; until: string } | { state: 'unknown' };
export function reiLockParcel(parcelId: string, now: string, plantings: readonly Row[], links: readonly Row[], sprayRows: readonly Row[]): Lock {
  if (!parseInstant(now).known) return { state: 'unknown' };
  const jobs = new Set(links.filter((l) => plantings.some((p) => p.id === l.planting_id && p.parcel_id === parcelId)).map((l) => l.job_id));
  let until: string | undefined;
  let unknown = false;
  for (const sp of effectiveSprays(sprayRows).filter((r) => jobs.has(r.job_id))) {
    const hours = typeof sp.rei_hours === 'string' && sp.rei_hours !== NOT_ON_LABEL ? parseReiHours(sp.rei_hours) : parseReiHours('');
    const end = reiEnd(String(sp.sprayed_at), hours);
    if (!end.known) { unknown = true; continue; }
    if (!waitOver(now, end) && (until === undefined || end.value > until)) until = end.value;
  }
  return until !== undefined ? { state: 'running', until } : unknown ? { state: 'unknown' } : { state: 'none' };
}

/** A job on several fields is locked by ANY of them: running wins (the latest end), then unknown; no field at all is unknown, never «free». */
export function reiLockJob(parcelIds: readonly string[], now: string, plantings: readonly Row[], links: readonly Row[], sprayRows: readonly Row[]): Lock {
  if (parcelIds.length === 0) return { state: 'unknown' };
  const locks = parcelIds.map((id) => reiLockParcel(id, now, plantings, links, sprayRows));
  let until: string | undefined;
  for (const l of locks) if (l.state === 'running' && (until === undefined || l.until > until)) until = l.until;
  if (until !== undefined) return { state: 'running', until };
  return locks.some((l) => l.state === 'unknown') ? { state: 'unknown' } : { state: 'none' };
}

/** «Έγινε» is open only when the lock is positively «none»: a running OR an unknown re-entry period keeps it closed. */
export const doneBlocked = (l: Lock): boolean => l.state !== 'none';
