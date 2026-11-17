import { parseInstant, parseWhole, parsePhiDays, phiEnd, waitOver } from '@aloni/rules-core';
import type { Row } from '../db/schema';
import { NOT_ON_LABEL } from '../labels/label-use';
import { effectiveSprays } from './spray';

// Harvest is allowed only when EVERY spray on the planting has a KNOWN waiting period that has run out. An unknown waiting period blocks (until Bora
// enters the label's value as an amending row). There is no override and no button that lifts the block by hand.

export type Gate = { ok: true } | { ok: false; reason: 'unknown' | 'running' | 'time'; until?: string };

/** Can this planting be harvested at `at` (a UTC second)? Recomputed from the stored PHI days and spray time through phiEnd, never from a stored end. */
export function harvestGate(plantingId: string, at: string, links: readonly Row[], sprayRows: readonly Row[]): Gate {
  if (!parseInstant(at).known) return { ok: false, reason: 'time' };
  const jobs = new Set(links.filter((l) => l.planting_id === plantingId).map((l) => l.job_id));
  let until: string | undefined;
  for (const sp of effectiveSprays(sprayRows).filter((r) => jobs.has(r.job_id))) {
    const days = typeof sp.phi_days === 'string' && sp.phi_days !== NOT_ON_LABEL ? parsePhiDays(sp.phi_days) : parsePhiDays('');
    const end = phiEnd(String(sp.sprayed_at), days);
    if (!end.known) return { ok: false, reason: 'unknown' };
    if (!waitOver(at, end)) until = until === undefined || end.value > until ? end.value : until; // ISO seconds sort like time
  }
  return until === undefined ? { ok: true } : { ok: false, reason: 'running', until };
}

export interface HarvestInput { plantingId: string; crates: string; harvestedAt: string; note: string }
export type HarvestResult = { ok: true; row: Row } | { ok: false; planting: boolean; crates: boolean; time: boolean; gate: Gate | undefined };

export function buildHarvest(input: HarvestInput, links: readonly Row[], sprayRows: readonly Row[], farmId: string, nowIso: string, id: string): HarvestResult {
  const crates = parseWhole<'Crates'>(input.crates);
  const bad = { planting: !input.plantingId, crates: !crates.known || crates.value < 1, time: !parseInstant(input.harvestedAt).known };
  const gate = input.plantingId ? harvestGate(input.plantingId, input.harvestedAt, links, sprayRows) : undefined;
  if (bad.planting || bad.crates || bad.time || !gate?.ok) return { ok: false, ...bad, gate: gate?.ok ? undefined : gate };
  return { ok: true, row: { id, farm_id: farmId, planting_id: input.plantingId, crates_str: input.crates.trim(), harvested_at: input.harvestedAt, created_at: nowIso, ...(input.note.trim() ? { note: input.note.trim() } : {}) } };
}

export type Cut = { state: 'free' } | { state: 'unknown' } | { state: 'from'; at: string };

/**
 * «Κοπή από …» for a parcel, from the waiting periods of ALL its plantings: one unknown waiting period makes the whole parcel «unknown» (blocked); otherwise
 * the LATEST end; with nothing running (or nothing sprayed) it is free. It uses only the stored label values (signed, or Bora's own entry): never a default.
 */
export function cutFromParcel(parcelId: string, now: string, plantings: readonly Row[], links: readonly Row[], sprayRows: readonly Row[]): Cut {
  let latest: string | undefined;
  for (const p of plantings.filter((x) => x.parcel_id === parcelId && !x.deleted_at)) {
    const g = harvestGate(p.id, now, links, sprayRows);
    if (g.ok) continue;
    if (g.reason !== 'running') return { state: 'unknown' }; // unknown waiting period or unreadable time
    if (g.until && (latest === undefined || g.until > latest)) latest = g.until;
  }
  return latest === undefined ? { state: 'free' } : { state: 'from', at: latest };
}
