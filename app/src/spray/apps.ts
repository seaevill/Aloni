import type { Row } from '../db/schema';
import { signedUseOf } from '../labels/label-use';
import { effectiveSprays } from './spray';

// MAX APPLICATIONS (the signed label's own «most applications» value): counted per PLANTING (one crop cycle) and product, over the sprays in force (a correction replaces the row it amends).
// Exceeding it never refuses the record (a spraying that really happened must reach the legal record): it is MARKED and a reason is required.

/** How many sprays of this product are already in force on the most-sprayed of the chosen plantings. */
export function priorApps(sprays: readonly Row[], links: readonly Row[], plantingIds: readonly string[], productId: string): number {
  const byJob = new Map<string, Set<string>>();
  for (const l of links) { const s = byJob.get(String(l.job_id)) ?? new Set<string>(); s.add(String(l.planting_id)); byJob.set(String(l.job_id), s); }
  const counts = plantingIds.map((pid) => effectiveSprays(sprays.filter((s) => !s.deleted_at)).filter((s) => s.product_id === productId && byJob.get(String(s.job_id))?.has(pid)).length);
  return counts.reduce((m, c) => (c > m ? c : m), 0);
}

/** true only when the label is SIGNED (so its maximum is the agronomist's) and one more application would pass it. An unsigned or incomplete label has no usable maximum: not judged here. */
export function exceedsMax(label: Row | undefined, prior: number): boolean {
  const signed = label ? signedUseOf(label) : undefined;
  return !!signed?.known && prior + 1 > signed.value.maxApps;
}
