import { parseInstant, parseWhole, parsePhiDays, parseReiHours, phiEnd, reiEnd, waitOver } from '@aloni/rules-core';
import type { Row } from '../db/schema';
import { NOT_ON_LABEL, readUse, statusOf } from '../labels/label-use';
import { effectiveSprays } from './spray';

// Harvest is allowed only when EVERY spray on the planting has a KNOWN waiting period that has run out. An unknown waiting period blocks (until Bora
// enters the label's value as an amending row). There is no override and no button that lifts the block by hand.

export type Source = 'label' | 'manual';
export type Gate = { ok: true } | { ok: false; reason: 'unknown' | 'running' | 'time'; until?: string; source?: Source; late?: true; by?: 'phi' | 'rei' };
const isLateRow = (r: Row): boolean => Array.isArray(r.flags) && r.flags.includes('late_entry');

/**
 * The waiting and re-entry period of ONE spray on ONE planting, from the SIGNED label use of the planting's OWN crop for the spray's own product (the same rule as the server's
 * private.planting_gate, 0032). No such label, an unsigned or changed one, or one with a missing value = undefined = UNKNOWN = closed. A stored or typed period never opens anything.
 */
function labelEnds(sp: Row, planting: Row | undefined, labels: readonly Row[]): { phi: string; rei: string } | undefined {
  if (!planting) return undefined;
  const mine = labels.filter((l) => l.product_id === sp.product_id && l.crop_id === planting.crop_id && (!l.deleted_at || l.id === sp.label_use_id));
  if (mine.length === 0) return undefined;
  let phi: string | undefined; let rei: string | undefined;
  for (const l of mine) {
    if (statusOf(l) !== 'signed') return undefined;      // an unsigned draft is unknown, even with values (the server says the same)
    const u = readUse(l);
    const pe = phiEnd(String(sp.sprayed_at), u.phiDays); const re = reiEnd(String(sp.sprayed_at), u.reiHours);
    if (!pe.known || !re.known) return undefined;
    if (phi === undefined || pe.value > phi) phi = pe.value;
    if (rei === undefined || re.value > rei) rei = re.value;
  }
  return phi === undefined || rei === undefined ? undefined : { phi, rei };
}
const later = (a: string, b: string): string => (a > b ? a : b);

/** Can this planting be harvested at `at` (a UTC second)? Recomputed from the stored PHI days and spray time through phiEnd, never from a stored end. */
export function harvestGate(plantingId: string, at: string, links: readonly Row[], sprayRows: readonly Row[], plantings: readonly Row[], labels: readonly Row[]): Gate {
  if (!parseInstant(at).known) return { ok: false, reason: 'time' };
  const jobs = new Set(links.filter((l) => l.planting_id === plantingId).map((l) => l.job_id));
  let until: string | undefined;
  let source: Source | undefined;
  let late = false;
  let by: 'phi' | 'rei' = 'phi';
  const planting = plantings.find((x) => x.id === plantingId);
  for (const sp of effectiveSprays(sprayRows).filter((r) => jobs.has(r.job_id))) {
    const lab = labelEnds(sp, planting, labels);
    if (!lab) return { ok: false, reason: 'unknown' };
    const days = typeof sp.phi_days === 'string' && sp.phi_days !== NOT_ON_LABEL ? parsePhiDays(sp.phi_days) : parsePhiDays('');
    const end = phiEnd(String(sp.sprayed_at), days);
    if (!end.known) return { ok: false, reason: 'unknown' };
    // a harvest means entering the field: the re-entry period (REI) must be over too, and an unknown REI blocks like an unknown PHI
    const hours = typeof sp.rei_hours === 'string' && sp.rei_hours !== NOT_ON_LABEL ? parseReiHours(sp.rei_hours) : parseReiHours('');
    const re = reiEnd(String(sp.sprayed_at), hours);
    if (!re.known) return { ok: false, reason: 'unknown' };
    const phiAt = later(end.value, lab.phi); const reiAt = later(re.value, lab.rei);      // the stored period may only EXTEND the label's, never shorten it
    const [lastV, kind] = reiAt > phiAt ? ([reiAt, 'rei'] as const) : ([phiAt, 'phi'] as const);
    const last = { known: true as const, value: lastV };
    if (!waitOver(at, last) && (until === undefined || last.value > until)) { until = last.value; by = kind; source = sp.phi_source === 'manual' ? 'manual' : 'label'; late = isLateRow(sp); } // ISO seconds sort like time; the LATEST end names its source
  }
  return until === undefined ? { ok: true } : { ok: false, reason: 'running', until, source, by, ...(late ? { late: true as const } : {}) };
}

export interface HarvestInput { plantingId: string; crates: string; harvestedAt: string; note: string; /** «Ποιος έκοψε»: the id of a roster worker. Required. */ cutBy: string }
export type HarvestResult = { ok: true; row: Row } | { ok: false; planting: boolean; crates: boolean; time: boolean; cutBy: boolean; gate: Gate | undefined };

/** The clock's ISO time has milliseconds; the waiting-period logic reads whole UTC seconds. An unreadable «now» stays unreadable (and so blocks). */
const wholeSeconds = (iso: string): string => iso.replace(/\.\d+Z$/, 'Z');

/**
 * The gate is checked at NOW (the phone's clock), never at the typed harvest time: a time in the future cannot be used to step over a waiting period, and a
 * harvest time later than now is refused outright. A past time is a record of what already happened.
 */
export function buildHarvest(input: HarvestInput, links: readonly Row[], sprayRows: readonly Row[], farmId: string, nowIso: string, id: string, plantings: readonly Row[], labels: readonly Row[]): HarvestResult {
  const crates = parseWhole<'Crates'>(input.crates);
  const now = wholeSeconds(nowIso);
  const bad = { planting: !input.plantingId, cutBy: input.cutBy.trim() === '', crates: !crates.known || crates.value < 1 || crates.value > 9999, time: !parseInstant(input.harvestedAt).known || input.harvestedAt > now };
  const gate = input.plantingId ? harvestGate(input.plantingId, now, links, sprayRows, plantings, labels) : undefined;
  if (bad.planting || bad.crates || bad.time || bad.cutBy || !gate?.ok) return { ok: false, ...bad, gate: gate?.ok ? undefined : gate };
  return { ok: true, row: { id, farm_id: farmId, planting_id: input.plantingId, cut_by: input.cutBy, crates_str: input.crates.trim(), harvested_at: input.harvestedAt, created_at: nowIso, ...(input.note.trim() ? { note: input.note.trim() } : {}) } };
}

export type Cut = { state: 'free' } | { state: 'unknown' } | { state: 'from'; at: string; source: Source; late?: true };

/**
 * «Κοπή από …» for a parcel, from the waiting periods of ALL its plantings: one unknown waiting period makes the whole parcel «unknown» (blocked); otherwise
 * the LATEST end; with nothing running (or nothing sprayed) it is free. It uses only the stored label values (signed, or Bora's own entry): never a default.
 */
export function cutFromParcel(parcelId: string, now: string, plantings: readonly Row[], links: readonly Row[], sprayRows: readonly Row[], labels: readonly Row[]): Cut {
  let latest: string | undefined;
  let source: Source = 'label';
  let late = false;
  for (const p of plantings.filter((x) => x.parcel_id === parcelId && !x.deleted_at)) {
    const g = harvestGate(p.id, now, links, sprayRows, plantings, labels);
    if (g.ok) continue;
    if (g.reason !== 'running') return { state: 'unknown' }; // unknown waiting period or unreadable time
    if (g.until && (latest === undefined || g.until > latest)) { latest = g.until; source = g.source ?? 'label'; late = g.late === true; }
  }
  return latest === undefined ? { state: 'free' } : { state: 'from', at: latest, source, ...(late ? { late: true as const } : {}) };
}

/** Re-entry lock for a field: the LATEST running re-entry end among its sprays (from the END of the spraying), or «unknown» when a spray there has no known REI. */
export type Lock = { state: 'none' } | { state: 'running'; until: string } | { state: 'unknown' };
export function reiLockParcel(parcelId: string, now: string, plantings: readonly Row[], links: readonly Row[], sprayRows: readonly Row[], labels: readonly Row[]): Lock {
  if (!parseInstant(now).known) return { state: 'unknown' };
  let until: string | undefined;
  let unknown = false;
  for (const p of plantings.filter((x) => x.parcel_id === parcelId && !x.deleted_at)) {      // every planting by ITS OWN crop's signed label (m9 S-NEW-1)
    const jobs = new Set(links.filter((l) => l.planting_id === p.id).map((l) => l.job_id));
    for (const sp of effectiveSprays(sprayRows).filter((r) => jobs.has(r.job_id))) {
      const lab = labelEnds(sp, p, labels);
      const hours = typeof sp.rei_hours === 'string' && sp.rei_hours !== NOT_ON_LABEL ? parseReiHours(sp.rei_hours) : parseReiHours('');
      const stored = reiEnd(String(sp.sprayed_at), hours);
      if (!lab || !stored.known) { unknown = true; continue; }
      const endAt = later(stored.value, lab.rei);
      if (!waitOver(now, { known: true as const, value: endAt }) && (until === undefined || endAt > until)) until = endAt;
    }
  }
  return until !== undefined ? { state: 'running', until } : unknown ? { state: 'unknown' } : { state: 'none' };
}

/** A job on several fields is locked by ANY of them: running wins (the latest end), then unknown; no field at all is unknown, never «free». */
export function reiLockJob(parcelIds: readonly string[], now: string, plantings: readonly Row[], links: readonly Row[], sprayRows: readonly Row[], labels: readonly Row[]): Lock {
  if (parcelIds.length === 0) return { state: 'unknown' };
  const locks = parcelIds.map((id) => reiLockParcel(id, now, plantings, links, sprayRows, labels));
  let until: string | undefined;
  for (const l of locks) if (l.state === 'running' && (until === undefined || l.until > until)) until = l.until;
  if (until !== undefined) return { state: 'running', until };
  return locks.some((l) => l.state === 'unknown') ? { state: 'unknown' } : { state: 'none' };
}

/** «Έγινε» is open only when the lock is positively «none»: a running OR an unknown re-entry period keeps it closed. */
export const doneBlocked = (l: Lock): boolean => l.state !== 'none';
