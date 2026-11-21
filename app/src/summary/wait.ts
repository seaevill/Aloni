import type { Row } from '../db/schema';
import { harvestGate } from '../spray/harvest';
import { effectiveSprays } from '../spray/spray';

// What the Καλλιέργειες and Χωράφια cards say about waiting: the last spraying and the waiting state, FROM THE RECORDS, by the very same rule as the harvest gate (harvestGate, the phone's copy of the server's planting_gate):
// the SIGNED label of the planting's own crop for the spray's own product decides; no such label = unknown = closed. Nothing is worked out separately here, and nothing is defaulted.
export type WaitState = 'free' | 'running' | 'unknown';
export interface Wait { lastSprayAt: string | undefined; state: WaitState; until?: string }
const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const newest = (xs: readonly string[]): string | undefined => xs.reduce<string | undefined>((a, b) => (a === undefined || b > a ? b : a), undefined);

export function plantingWait(plantingId: string, now: string, links: readonly Row[], sprays: readonly Row[], plantings: readonly Row[], labels: readonly Row[]): Wait {
  const jobs = new Set(links.filter((l) => l.planting_id === plantingId).map((l) => text(l.job_id)));
  const lastSprayAt = newest(effectiveSprays(sprays.filter((s) => jobs.has(text(s.job_id)))).map((s) => text(s.sprayed_at)).filter((d) => d !== ''));
  const g = harvestGate(plantingId, now, links, sprays, plantings, labels);
  if (g.ok) return { lastSprayAt, state: 'free' };
  if (g.reason === 'running' && g.until !== undefined) return { lastSprayAt, state: 'running', until: g.until };
  return { lastSprayAt, state: 'unknown' };            // unknown reason, an unreadable clock or a missing end: never «free»
}

/** The parcel as a whole: unknown if ANY live planting is unknown, else running until the latest end, else free; the newest spraying over its plantings. */
export function parcelWait(parcelId: string, now: string, plantings: readonly Row[], links: readonly Row[], sprays: readonly Row[], labels: readonly Row[]): Wait {
  const waits = plantings.filter((p) => p.parcel_id === parcelId && !p.deleted_at).map((p) => plantingWait(text(p.id), now, links, sprays, plantings, labels));
  const lastSprayAt = newest(waits.flatMap((w) => (w.lastSprayAt === undefined ? [] : [w.lastSprayAt])));
  if (waits.some((w) => w.state === 'unknown')) return { lastSprayAt, state: 'unknown' };
  const until = newest(waits.flatMap((w) => (w.until === undefined ? [] : [w.until])));
  return until === undefined ? { lastSprayAt, state: 'free' } : { lastSprayAt, state: 'running', until };
}
