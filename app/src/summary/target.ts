import { parseWhole } from '@aloni/rules-core';
import type { Row } from '../db/schema';
import { dayOf } from './today';

// The season target per crop (E6): how many crates the owner wants from a crop since a start day, how many were LOGGED, how many remain.
// Only logged harvests of this crop count; a count nobody can read is counted apart and never added; percent is rounded DOWN (the ring never shows more than was done); days are Athens days.
// Until the server table exists (SQL 0040) the target is kept on this phone only; the screen says so.
export interface SeasonTarget { crates: string; since: string }
export interface SeasonProgress { target: number; done: number | undefined; remaining: number | undefined; percent: number | undefined; over: number; unreadable: number }

const text = (v: unknown): string => (typeof v === 'string' ? v : '');

export function parseTarget(crates: string, since: string): { ok: true; value: SeasonTarget } | { ok: false; why: 'crates' | 'since' } {
  const c = crates.trim();
  if (!/^[1-9]\d{0,5}$/.test(c)) return { ok: false, why: 'crates' };                 // a whole number of crates above 0; no decimals, no default
  const d = since.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || dayOf(`${d}T12:00:00.000Z`) !== d) return { ok: false, why: 'since' };   // a real calendar day; none is invented
  return { ok: true, value: { crates: c, since: d } };
}

export function seasonProgress(cropId: string, plantings: readonly Row[], harvests: readonly Row[], target: SeasonTarget, nowIso: string): SeasonProgress | undefined {
  if (!/^[1-9]\d{0,5}$/.test(target.crates)) return undefined;       // a stored target that is not a whole number of crates is not used
  const goal = parseFloat(target.crates);
  const ofCrop = new Set(plantings.filter((p) => p.crop_id === cropId).map((p) => String(p.id)));     // a harvest counts even if its planting was archived later
  const today = dayOf(nowIso);
  const counts: number[] = []; let unreadable = 0;
  for (const h of harvests) {
    if (!ofCrop.has(text(h.planting_id))) continue;
    const day = dayOf(h.harvested_at);
    if (day === '' || day < target.since || day > today) continue;
    const n = parseWhole<'Crates'>(text(h.crates_str));
    if (n.known) counts.push(n.value); else unreadable++;
  }
  if (counts.length === 0) return { target: goal, done: undefined, remaining: undefined, percent: undefined, over: 0, unreadable };
  const done = counts.reduce((a, b) => a + b);
  let percent = 0; while (percent < 100 && (percent + 1) * goal <= done * 100) percent++;      // whole percent, rounded DOWN, by whole-number comparison (no division)
  return { target: goal, done, remaining: done >= goal ? 0 : goal - done, percent, over: done > goal ? done - goal : 0, unreadable };
}
