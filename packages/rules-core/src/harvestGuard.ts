import type { Output, Snapshot, Veto } from './engine';
import { known } from './known';
import { athensDate } from './stock';
import { isCalendarDate, phiEnd, waitOver } from './waits';

export interface HarvestGuardFact {
  plantingId: string;
  status: string;
  harvestFrom?: string;
  harvestTo?: string;
  estimatedCrates?: number;
  loggedCrates?: readonly number[];
  scoutingCondition?: boolean;
}

type GuardOutput = Pick<Output, 'rule_id' | 'kind' | 'category'> & Partial<Output>;

const crateCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/** Count only completed applications with matching signed label records. */
function clearance(s: Snapshot, plantingId: string, cropId: string): string | undefined {
  const sprays = s.jobs.filter((j) => j.kind === 'spray' && j.status === 'done' && j.plantingIds.includes(plantingId));
  let latest: string | undefined;
  for (const job of sprays) {
    const uses = s.uses.filter((row) => row.productId === job.productId && row.cropId === cropId);
    const use = uses.length === 1 ? uses[0] : undefined;
    if (!use?.signed.known || job.endedAt === undefined) return undefined;
    const end = phiEnd(job.endedAt, known(use.signed.value.phiDays));
    if (!end.known || !waitOver(s.asOf, end)) return undefined;
    if (latest === undefined || end.value > latest) latest = end.value;
  }
  return latest;
}

export function harvestGuard(s: Snapshot): GuardOutput[] {
  const today = athensDate(s.asOf);
  const out: GuardOutput[] = [];
  for (const facts of s.harvestGuard ?? []) {
    const planting = s.plantings.find((p) => p.id === facts.plantingId);
    if (!planting || (facts.status !== 'harvesting' && facts.status !== 'ready')) continue;
    const base = { rule_id: 'PHI-GUARD', planting_ids: [planting.id], parcel_ids: [planting.parcelId] };
    if (s.ruleStatus['PHI-GUARD'] !== 'signed') {
      out.push({ ...base, kind: 'info', category: 'harvest_guard_inputs', values: { status: facts.status, badge: 'not_signed_off' } });
      continue;
    }
    const vetoes: Veto[] = [{ by: 'PHI-GUARD', vetoed: 'spray', planting_id: planting.id, reason: facts.status === 'harvesting' ? 'lot_harvesting' : 'lot_ready' }];
    const startOfHarvest = facts.harvestFrom;
    const endOfHarvest = facts.harvestTo;
    const ended = clearance(s, planting.id, planting.cropId);
    if (ended === undefined || !facts.scoutingCondition || startOfHarvest === undefined || !isCalendarDate(startOfHarvest) ||
        endOfHarvest === undefined || !isCalendarDate(endOfHarvest) || today < startOfHarvest || today > endOfHarvest) {
      out.push({ ...base, kind: 'block', category: 'harvest_spray_conflict', vetoes });
      continue;
    }
    out.push({ ...base, kind: 'alert', category: 'harvest_and_scout', severity: 'medium', vetoes,
      values: { status: facts.status, safe_since: ended, scouting_prompt: true } });
    if (!crateCount(facts.estimatedCrates) || !facts.loggedCrates?.every(crateCount)) continue;
    const logged = facts.loggedCrates.reduce((sum, count) => sum + count, 0);
    if (!crateCount(logged) || logged >= facts.estimatedCrates) continue;
    out.push({ ...base, kind: 'recommendation', category: 'harvest_and_scout', vetoes,
      window: { start: today, end: endOfHarvest },
      values: { est_crates: facts.estimatedCrates, logged_crates: logged, remaining_est_crates: facts.estimatedCrates - logged, scouting_prompt: true } });
  }
  return out;
}
