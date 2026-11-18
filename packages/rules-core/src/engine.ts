import { known, type Known } from './known';
import type { SignedLabelUse } from './label';
import { summariseDays, type Hour, type SprayParams, type Sun } from './sprayWindow';
import { parseInstant, phiEnd, reiEnd, waitOver } from './waits';

// The rules engine (M3 start). PURE: no clock (`asOf` is an argument), no I/O. Deciding rules take ONLY a Known<SignedLabelUse>: an unsigned, changed or
// incomplete label gives `unknown`, and unknown is «blocked», never «passed». A rule whose own thresholds are not signed (`ruleStatus: unsigned`) may
// only SHOW its inputs: it never alerts, never blocks and never notifies (CLAUDE.md rule 3). Times are UTC seconds «YYYY-MM-DDTHH:MM:SSZ».

export interface PlantingFact { id: string; parcelId: string; cropId: string }
export interface JobFact { id: string; kind: string; status: string; plantingIds: readonly string[]; productId: string; startedAt: string; endedAt: string | undefined }
/** `maxApps` / `minIntervalDays` are the label's own raw facts for ROT: undefined = the label does not give them = UNKNOWN (never a default). */
export interface UseFact { productId: string; cropId: string; signed: Known<SignedLabelUse>; maxApps?: number; minIntervalDays?: number }
export interface ProductFact { id: string; groupCode: string | undefined }
export interface DraftJob { id: string; kind: string; plantingIds: readonly string[]; productId: string }
export interface TaskFact { id: string; plantingIds: readonly string[]; at: string }
export interface Veto { by: string; vetoed: string; reason: string; planting_id?: string; task_id?: string; product_id?: string }
export interface Output {
  rule_id: string; kind: 'alert' | 'block' | 'info'; category: string; severity?: 'high' | 'medium' | 'low'; confidence?: 'high' | 'medium' | 'low'; notify: boolean;
  parcel_ids: string[]; planting_ids: string[]; product_ids: string[]; crop_ids: string[];
  window?: { start: string; end: string }; values: Record<string, unknown>; vetoes: Veto[];
}
export interface Snapshot {
  asOf: string; plantings: readonly PlantingFact[]; jobs: readonly JobFact[]; uses: readonly UseFact[]; tasks: readonly TaskFact[];
  ruleStatus: Readonly<Record<string, 'signed' | 'unsigned'>>; parcelsForInfo: readonly string[]; draftJobs: readonly DraftJob[]; products: readonly ProductFact[];
  /** Hourly forecast per parcel (from the server later), sun times per local day, daily rain per parcel, and the SPRAY-WIN thresholds. */
  weather?: { hours: Readonly<Record<string, readonly Hour[]>>; sun: Readonly<Record<string, Sun>>; rainDaily: Readonly<Record<string, Readonly<Record<string, number>>>> };
  sprayParams?: SprayParams;
}

const blank = (o: Pick<Output, 'rule_id' | 'kind' | 'category'> & Partial<Output>): Output => ({ notify: false, parcel_ids: [], planting_ids: [], product_ids: [], crop_ids: [], values: {}, vetoes: [], ...o });
const doneSprays = (s: Snapshot) => s.jobs.filter((j) => j.kind === 'spray' && j.status === 'done');

/** PHI: a sprayed planting is on hold until the END of the spraying + the label's PHI (exact seconds); no label row or an unsigned one = BLOCKED with no date at all. */
function phi(s: Snapshot): Output[] {
  const out: Output[] = [];
  for (const j of doneSprays(s)) for (const pid of j.plantingIds) {
    const p = s.plantings.find((x) => x.id === pid);
    if (!p) continue;
    const use = s.uses.find((u) => u.productId === j.productId && u.cropId === p.cropId);
    if (!use || !use.signed.known) {
      out.push(blank({ rule_id: 'PHI', kind: 'alert', category: 'phi_blocked_unknown', severity: 'high', planting_ids: [pid], parcel_ids: [p.parcelId], product_ids: [j.productId], values: { lot_status: 'blocked', safe_from: null, reason: use ? 'not_signed' : 'no_label_row' }, vetoes: [{ by: 'PHI', vetoed: 'harvest', planting_id: pid, reason: use ? 'not_signed' : 'no_label_row' }] }));
      if (!use) out.push(blank({ rule_id: 'REG', kind: 'alert', category: 'unregistered_use', severity: 'high', planting_ids: [pid], parcel_ids: [p.parcelId], product_ids: [j.productId] }));
      continue;
    }
    const end = phiEnd(j.endedAt ?? j.startedAt, known(use.signed.value.phiDays)); // counted from the END of the spraying (the start is used only when no end is known)
    if (end.known && !waitOver(s.asOf, end)) {
      out.push(blank({ rule_id: 'PHI', kind: 'alert', category: 'phi_hold', severity: 'high', confidence: 'medium', planting_ids: [pid], parcel_ids: [p.parcelId], product_ids: [j.productId], window: { start: j.startedAt, end: end.value }, values: { safe_from: end.value, phi_days: use.signed.value.phiDays, lot_status: 'hold_phi' } }));
    }
  }
  return out;
}

/** REI: re-entry = the END of the spraying + the label's REI hours (never from midnight, never shorter); tasks on that planting before it are vetoed. */
function rei(s: Snapshot): Output[] {
  const out: Output[] = [];
  for (const j of doneSprays(s)) {
    if (!j.endedAt) continue;
    for (const pid of j.plantingIds) {
      const p = s.plantings.find((x) => x.id === pid);
      const use = p && s.uses.find((u) => u.productId === j.productId && u.cropId === p.cropId);
      if (!p || !use?.signed.known) continue;
      const end = reiEnd(j.endedAt, known(use.signed.value.reiHours));
      if (!end.known || waitOver(s.asOf, end)) continue;
      const own = s.tasks.filter((t) => t.plantingIds.includes(pid));
      const blocked = own.filter((t) => !waitOver(t.at, end) && t.at !== end.value && t.at < end.value);
      out.push(blank({ rule_id: 'REI', kind: 'alert', category: 'rei', severity: 'high', confidence: 'medium', planting_ids: [pid], parcel_ids: [p.parcelId], window: { start: j.endedAt, end: end.value },
        values: { reentry_at: end.value, rei_h: use.signed.value.reiHours, blocked_task_ids: blocked.map((t) => t.id), allowed_task_ids: s.tasks.filter((t) => !blocked.includes(t)).map((t) => t.id) },
        vetoes: blocked.map((t) => ({ by: 'REI', vetoed: 'task', task_id: t.id, reason: 'before_reentry' })) }));
    }
  }
  return out;
}

const registered = (s: Snapshot, productId: string, plantingId: string): boolean => {
  const p = s.plantings.find((x) => x.id === plantingId);
  const use = p && s.uses.find((u) => u.productId === productId && u.cropId === p.cropId);
  return !!use?.signed.known; // only a signed, complete label counts as «on the label»
};

/** REG: a draft spray may only cover the plantings the label lists for that product; the others are excluded (never the whole parcel). */
function reg(s: Snapshot): Output[] {
  const out: Output[] = [];
  for (const j of s.draftJobs.filter((x) => x.kind === 'spray')) {
    const allowed = j.plantingIds.filter((id) => registered(s, j.productId, id));
    const excluded = j.plantingIds.filter((id) => !allowed.includes(id));
    if (excluded.length === 0) continue;
    out.push(blank({ rule_id: 'REG', kind: 'block', category: 'exclude_unregistered_beds', severity: 'high', planting_ids: excluded, product_ids: [j.productId], values: { job_id: j.id, allowed_planting_ids: allowed, exclude_planting_ids: excluded },
      vetoes: excluded.map((id) => ({ by: 'REG', vetoed: 'spray', planting_id: id, reason: 'not_on_label' })) }));
  }
  return out;
}

/** ROT: with the product's group code or the label's maximum applications / minimum interval missing, the rotation check is UNKNOWN and never cleared. */
function rot(s: Snapshot): Output[] {
  const out: Output[] = [];
  for (const j of s.draftJobs.filter((x) => x.kind === 'spray')) {
    const missing: string[] = [];
    if (!s.products.find((p) => p.id === j.productId)?.groupCode) missing.push('group_code');
    const uses = j.plantingIds.map((id) => s.plantings.find((p) => p.id === id)).map((p) => s.uses.find((u) => u.productId === j.productId && u.cropId === p?.cropId));
    if (uses.some((u) => u?.maxApps === undefined)) missing.push('max_apps');
    if (uses.some((u) => u?.minIntervalDays === undefined)) missing.push('min_interval_days');
    if (missing.length === 0) continue;
    out.push(blank({ rule_id: 'ROT', kind: 'block', category: 'rotation_unknown', severity: 'high', planting_ids: [...j.plantingIds], product_ids: [j.productId], values: { status: 'unknown', missing },
      vetoes: [{ by: 'ROT', vetoed: 'spray', product_id: j.productId, reason: 'unknown_never_cleared' }] }));
  }
  return out;
}

/** SPRAY-WIN, the front check: when NO day of the forecast has even one OK hour in any parcel, say so (medium alert). Hours are judged by `hourReasons` (conservative). */
function sprayWindowClosed(s: Snapshot): Output[] {
  if (s.ruleStatus['SPRAY-WIN'] !== 'signed' || !s.weather || !s.sprayParams) return [];
  const w = s.weather; const params = s.sprayParams;
  const parcels = Object.keys(w.hours);
  const per = parcels.map((p) => ({ p, days: summariseDays(w.hours[p], params, w.sun) }));
  const days = [...new Set(per.flatMap((x) => x.days.map((d) => d.day)))].sort();
  const closed = days.filter((d) => per.every((x) => { const y = x.days.find((z) => z.day === d); return y !== undefined && y.okHours === 0; }));
  if (days.length === 0 || closed.length !== days.length) return [];
  const gust: Record<string, number> = {};
  for (const p of parcels) gust[p] = Math.max(...w.hours[p].map((h) => h.gustKmh));
  return [blank({ rule_id: 'SPRAY-WIN', kind: 'alert', category: 'spray_window_closed', severity: 'medium', confidence: 'medium', parcel_ids: parcels, window: { start: days[0], end: days[days.length - 1] },
    values: { closed_days: closed, ok_hours: 0, rain_mm: w.rainDaily[parcels[0]] ?? {}, max_gust_kmh: gust } })];
}

/** A rule with unsigned thresholds only shows what it would look at. Never an alert, never a severity, never a notification. */
function infoOnly(s: Snapshot): Output[] {
  const frost = s.ruleStatus.FROST === 'unsigned' ? s.parcelsForInfo.map((id) => blank({ rule_id: 'FROST', kind: 'info', category: 'frost_inputs', parcel_ids: [id], values: { shows_inputs: true, badge: 'not_signed_off', notify: false } })) : [];
  const spray = s.ruleStatus['SPRAY-WIN'] === 'unsigned' ? Object.keys(s.weather?.hours ?? {}).map((id) => blank({ rule_id: 'SPRAY-WIN', kind: 'info', category: 'spray_window_inputs', parcel_ids: [id], values: { shows_inputs: true, badge: 'not_signed_off', notify: false } })) : [];
  return [...frost, ...spray];
}

export function runRules(s: Snapshot): Output[] {
  if (!parseInstant(s.asOf).known) return []; // no readable «now»: nothing is decided
  return [...phi(s), ...rei(s), ...reg(s), ...rot(s), ...sprayWindowClosed(s), ...infoOnly(s)];
}
