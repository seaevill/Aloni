import type { Row } from '../db/schema';
import type { Work } from '../fieldwork/fieldwork';
import { athensInstant } from '../spray/time';

// «Χρονολόγιο» of a parcel: ONE read-only stream of what the records say happened on it (sowing, sprayings, harvests), newest first.
// Information only: it shows the stored values as they are; a waiting-period end that is not stored is simply absent (unknown), never worked out here, and nothing is decided.
export const TIMELINE_MAX = 20;
const text = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');

export type TimelineEvent =
  | { kind: 'sown'; id: string; at: string; crop: string; archived?: true }
  | { kind: 'spray'; id: string; at: string; product: string; phiUntil?: string; reiUntil?: string }
  | { kind: 'harvest'; id: string; at: string; crop: string; crates: string; archived?: true }
  | { kind: 'cut'; id: string; at: string; method: 'shredder' | 'hand' | 'other' }
  | { kind: 'fertilise'; id: string; at: string; nForm: string; kgPerStr?: string }
  | { kind: 'irrigate'; id: string; at: string; m3?: string; minutes?: string }
  | { kind: 'observation'; id: string; at: string; what: string; note?: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ZONED_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const KIND_ORDER: Record<TimelineEvent['kind'], number> = { harvest: 0, spray: 1, observation: 2, irrigate: 3, fertilise: 4, cut: 5, sown: 6 };

function timelineInstant(at: string): number | undefined {
  const zoned = DATE.test(at) ? athensInstant(`${at}T00:00`) : ZONED_TIME.test(at) ? at : undefined;
  if (zoned === undefined) return undefined;
  const time = Date.parse(zoned);
  return Number.isFinite(time) ? time : undefined;
}

function compareTie(a: TimelineEvent, b: TimelineEvent): number {
  if (a.kind !== b.kind) return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
  return a.id.localeCompare(b.id);
}

/** `sprays` must already be the EFFECTIVE ones (a correction replaces its original: see effectiveSprays). */
export function parcelTimeline(
  parcelId: unknown, plantings: readonly Row[], links: readonly Row[], sprays: readonly Row[], harvests: readonly Row[],
  names: { crop: (id: unknown) => string; product: (id: unknown) => string },
  /** cut / clean records of THIS parcel (kept on the phone) */
  cuts: readonly { id: string; day: string; method: 'shredder' | 'hand' | 'other' }[] = [],
  /** the owner's fertilising / irrigation records (kept on the phone) and the observations (rows) – only the ones of THIS parcel are used */
  more: { work?: readonly Work[]; observations?: readonly Row[] } = {},
): TimelineEvent[] {
  // archived plantings stay in the history (what happened, happened); the same set the parcel productivity counts. Deleted HARVEST rows never show.
  const mine = plantings.filter((p) => p.parcel_id === parcelId);
  const archivedIds = new Set(mine.filter((p) => p.deleted_at).map((p) => String(p.id)));
  const ids = new Set(mine.map((p) => String(p.id)));
  const jobs = new Set(links.filter((l) => ids.has(String(l.planting_id))).map((l) => String(l.job_id)));
  const cropOf = (plantingId: unknown): string => names.crop(mine.find((p) => p.id === plantingId)?.crop_id);
  const events: TimelineEvent[] = [
    ...(more.work ?? []).filter((w) => w.parcel_id === parcelId).map((w): TimelineEvent => (w.kind === 'fertilise'
      ? { kind: 'fertilise', id: w.id, at: w.day, nForm: w.n_form ?? '', ...(w.n_kg_per_str !== undefined ? { kgPerStr: w.n_kg_per_str } : {}) }
      : { kind: 'irrigate', id: w.id, at: w.day, ...(w.m3 !== undefined ? { m3: w.m3 } : {}), ...(w.minutes !== undefined ? { minutes: w.minutes } : {}) })),
    ...(more.observations ?? []).filter((o) => o.parcel_id === parcelId && !o.deleted_at && text(o.observed_at) !== '').map((o): TimelineEvent => ({ kind: 'observation', id: String(o.id), at: text(o.observed_at), what: text(o.kind), ...(text(o.note) !== '' ? { note: text(o.note) } : {}) })),
    ...cuts.map((c): TimelineEvent => ({ kind: 'cut', id: c.id, at: c.day, method: c.method })),
    ...mine.filter((p) => text(p.sown_on) !== '').map((p): TimelineEvent => ({ kind: 'sown', id: String(p.id), at: text(p.sown_on), crop: names.crop(p.crop_id), ...(p.deleted_at ? { archived: true as const } : {}) })),
    ...sprays.filter((s) => jobs.has(String(s.job_id)) && text(s.sprayed_at) !== '').map((s): TimelineEvent => ({
      kind: 'spray', id: String(s.id), at: text(s.sprayed_at), product: names.product(s.product_id),
      ...(text(s.phi_until) !== '' ? { phiUntil: text(s.phi_until) } : {}), ...(text(s.rei_until) !== '' ? { reiUntil: text(s.rei_until) } : {}),
    })),
    ...harvests.filter((h) => !h.deleted_at && ids.has(String(h.planting_id)) && text(h.harvested_at) !== '').map((h): TimelineEvent => ({ kind: 'harvest', id: String(h.id), at: text(h.harvested_at), crop: cropOf(h.planting_id), crates: text(h.crates_str), ...(archivedIds.has(String(h.planting_id)) ? { archived: true as const } : {}) })),
  ];
  const dated: { event: TimelineEvent; instant: number }[] = [];
  const undated: TimelineEvent[] = [];
  for (const event of events) {
    const instant = timelineInstant(event.at);
    if (instant === undefined) undated.push(event);
    else dated.push({ event, instant });
  }
  dated.sort((a, b) => a.instant === b.instant ? compareTie(a.event, b.event) : b.instant - a.instant);
  return [...dated.map(({ event }) => event), ...undated.sort(compareTie)].slice(Number('0'), TIMELINE_MAX);
}
