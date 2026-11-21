import { registrationDose, type DoseCheck } from './registrationDose';
import { gapOutputs, type GapFacts } from './gap';
import { frostNights, thawMornings, type FrostFacts, type FrostHit } from './frost';
import { harvestGuard, type HarvestGuardFact } from './harvestGuard';
import { known, type Known } from './known';
import { salinityReading, type SalinityFacts } from './salinity';
import { stockHits, type StockFacts } from './stock';
import type { SignedLabelUse } from './label';
import { paramsValid, summariseDays, type Hour, type SprayParams, type Sun } from './sprayWindow';
import { isCalendarDate, parseInstant, phiEnd, reiEnd, waitOver } from './waits';

// The rules engine (M3 start). PURE: no clock (`asOf` is an argument), no I/O. Deciding rules take ONLY a Known<SignedLabelUse>: an unsigned, changed or
// incomplete label gives `unknown`, and unknown is «blocked», never «passed». A rule whose own thresholds are not signed (`ruleStatus: unsigned`) may
// only SHOW its inputs: it never alerts, never blocks and never notifies (CLAUDE.md rule 3). Times are UTC seconds «YYYY-MM-DDTHH:MM:SSZ».

export interface PlantingFact { id: string; parcelId: string; cropId: string }
export interface JobFact { id: string; kind: string; status: string; plantingIds: readonly string[]; productId: string; startedAt: string; endedAt: string | undefined }
/** `maxApps` / `minIntervalDays` are the label's own raw facts for ROT: undefined = the label does not give them = UNKNOWN (never a default). */
export interface UseFact { productId: string; cropId: string; signed: Known<SignedLabelUse>; target?: string | null; maxApps?: number; minIntervalDays?: number }
export interface ProductFact { id: string; groupCode: string | undefined }
export interface DraftJob { id: string; kind: string; plantingIds: readonly string[]; productId: string }
export interface TaskFact { id: string; plantingIds: readonly string[]; at: string }
export interface Veto { job_id?: string; by: string; vetoed: string; reason: string; planting_id?: string; task_id?: string; product_id?: string }
export interface Output {
  rule_id: string; kind: 'alert' | 'block' | 'info' | 'recommendation' | 'check'; category: string; severity?: 'high' | 'medium' | 'low'; confidence?: 'high' | 'medium' | 'low'; notify: boolean;
  parcel_ids: string[]; planting_ids: string[]; product_ids: string[]; crop_ids: string[];
  window?: { start: string; end: string }; values: Record<string, unknown>; vetoes: Veto[];
}
export interface Snapshot {
  asOf: string; plantings: readonly PlantingFact[]; jobs: readonly JobFact[]; uses: readonly UseFact[]; tasks: readonly TaskFact[];
  ruleStatus: Readonly<Record<string, 'signed' | 'unsigned'>>; parcelsForInfo: readonly string[]; draftJobs: readonly DraftJob[]; products: readonly ProductFact[];
  /** Hourly forecast per parcel (from the server later), sun times per local day, daily rain per parcel, and the SPRAY-WIN thresholds. */
  weather?: { hours: Readonly<Record<string, readonly Hour[]>>; sun: Readonly<Record<string, Sun>>; rainDaily: Readonly<Record<string, Readonly<Record<string, number>>>> };
  sprayParams?: SprayParams;
  /** Forecast nights per parcel with topo class, and the FROST thresholds (from the server later). */
  frost?: FrostFacts;
  /** Shelf, planned uses and the STOCK thresholds. */
  stock?: StockFacts;
  salinity?: SalinityFacts;
  gap?: GapFacts;
  harvestGuard?: readonly HarvestGuardFact[];
  doseChecks?: readonly DoseCheck[];
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
    // counted from the END of the spraying; a missing or unreadable end is «blocked» (never counted from the start, never skipped)
    const end = j.endedAt === undefined ? ({ known: false } as const) : phiEnd(j.endedAt, known(use.signed.value.phiDays));
    if (!end.known) {
      out.push(blank({ rule_id: 'PHI', kind: 'alert', category: 'phi_blocked_unknown', severity: 'high', planting_ids: [pid], parcel_ids: [p.parcelId], product_ids: [j.productId], values: { lot_status: 'blocked', safe_from: null, reason: j.endedAt === undefined ? 'no_end_time' : 'unreadable_time' }, vetoes: [{ by: 'PHI', vetoed: 'harvest', planting_id: pid, reason: j.endedAt === undefined ? 'no_end_time' : 'unreadable_time' }] }));
    } else if (!waitOver(s.asOf, end)) {
      out.push(blank({ rule_id: 'PHI', kind: 'alert', category: 'phi_hold', severity: 'high', confidence: 'medium', planting_ids: [pid], parcel_ids: [p.parcelId], product_ids: [j.productId], window: { start: j.startedAt, end: end.value }, values: { safe_from: end.value, phi_days: use.signed.value.phiDays, lot_status: 'hold_phi' } }));
    }
  }
  return out;
}

/** REI: re-entry = the END of the spraying + the label's REI hours (never from midnight, never shorter); tasks on that planting before it are vetoed. */
function rei(s: Snapshot): Output[] {
  const out: Output[] = [];
  const unknown = (j: JobFact, p: PlantingFact, reason: string): Output => {
    const own = s.tasks.filter((t) => t.plantingIds.includes(p.id));
    return blank({ rule_id: 'REI', kind: 'alert', category: 'rei_unknown', severity: 'high', planting_ids: [p.id], parcel_ids: [p.parcelId], product_ids: [j.productId],
      values: { reentry_at: null, reason, blocked_task_ids: own.map((t) => t.id), allowed_task_ids: s.tasks.filter((t) => !own.includes(t)).map((t) => t.id) },
      vetoes: own.map((t) => ({ by: 'REI', vetoed: 'task', task_id: t.id, reason: 'rei_unknown' })) });
  };
  for (const j of doneSprays(s)) {
    for (const pid of j.plantingIds) {
      const p = s.plantings.find((x) => x.id === pid);
      if (!p) continue;
      const use = s.uses.find((u) => u.productId === j.productId && u.cropId === p.cropId);
      if (!use?.signed.known) { out.push(unknown(j, p, 'not_signed')); continue; }
      if (j.endedAt === undefined) { out.push(unknown(j, p, 'no_end_time')); continue; }
      const end = reiEnd(j.endedAt, known(use.signed.value.reiHours));
      if (!end.known) { out.push(unknown(j, p, 'unreadable_time')); continue; }
      if (waitOver(s.asOf, end)) continue;
      const own = s.tasks.filter((t) => t.plantingIds.includes(pid));
      const blocked = own.filter((t) => !parseInstant(t.at).known || (!waitOver(t.at, end) && t.at !== end.value && t.at < end.value)); // an unreadable task time is blocked
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
  const unknown = !paramsValid(params) || per.some((x) => x.days.some((d) => d.okHours === 0 && d.reasons.some((r) => r === 'data_missing' || r === 'params_invalid')));
  if (unknown) return [blank({ rule_id: 'SPRAY-WIN', kind: 'info', category: 'spray_window_unknown', parcel_ids: parcels, values: { reason: 'data_or_thresholds_unusable', badge: 'unknown' } })]; // unknown is never «closed»
  const closed = days.filter((d) => per.every((x) => { const y = x.days.find((z) => z.day === d); return y !== undefined && y.okHours === 0; }));
  if (days.length === 0 || closed.length !== days.length) return [];
  const gust: Record<string, number> = {};
  for (const p of parcels) gust[p] = Math.max(...w.hours[p].map((h) => h.gustKmh));
  return [blank({ rule_id: 'SPRAY-WIN', kind: 'alert', category: 'spray_window_closed', severity: 'medium', confidence: 'medium', parcel_ids: parcels, window: { start: days[0], end: days[days.length - 1] },
    values: { closed_days: closed, ok_hours: 0, rain_mm: w.rainDaily[parcels[0]] ?? {}, max_gust_kmh: gust } })];
}

/** FROST: one alert listing EVERY affected parcel and night (never just the last night), plus «cover» (tender crops, only when fleece is on hand) and «no harvest before thaw» (guarded crops). Confidence is LOW: no parcel is calibrated. Never a damage claim. */
function frost(s: Snapshot): Output[] {
  const f = s.frost;
  if (s.ruleStatus.FROST !== 'signed' || !f) return [];
  const out: Output[] = [];
  const hit: { id: string; hits: FrostHit[] }[] = [];
  for (const [id, parcel] of Object.entries(f.parcels)) {
    const r = frostNights(parcel, f.params);
    if (r.missing.length > 0) out.push(blank({ rule_id: 'FROST', kind: 'info', category: 'frost_inputs_missing', parcel_ids: [id], values: { missing: r.missing, badge: 'unknown' } }));
    if (r.hits.length > 0) hit.push({ id, hits: r.hits });
  }
  if (hit.length === 0) return out;
  const nightsOf = (ids: readonly string[]) => {
    const rows = new Map<string, { from: string; to: string; row: Record<string, unknown>; leaf: Record<string, unknown> }>();
    for (const h of hit.filter((x) => ids.includes(x.id))) for (const x of h.hits) {
      const r = rows.get(x.night.night) ?? { from: x.night.from, to: x.night.to, row: { night: x.night.night }, leaf: { night: x.night.night } };
      r.row[h.id] = x.parcelTminC; r.leaf[h.id] = [...x.leafRangeC];
      rows.set(x.night.night, r);
    }
    const all = [...rows.values()].sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
    return { nights: all.map((r) => r.row), leaf: all.map((r) => r.leaf), window: { start: all[0].from, end: all.reduce((m, r) => (r.to > m ? r.to : m), all[0].to) } };
  };
  const plantsOf = (ids: readonly string[], crops: readonly string[]) => s.plantings.filter((p) => ids.includes(p.parcelId) && crops.includes(p.cropId));
  const ids = hit.map((x) => x.id);
  const base = nightsOf(ids);
  const tender = plantsOf(ids, f.tenderCrops); const guard = plantsOf(ids, f.guardCrops);
  const values = (n: ReturnType<typeof nightsOf>) => ({ nights: n.nights, leaf_range_c: n.leaf, leaf_basis: 'EST', damage_claimed: false });
  out.push(blank({ rule_id: 'FROST', kind: 'alert', category: 'frost_conditions', severity: 'high', confidence: 'low', parcel_ids: ids, planting_ids: [...tender, ...guard].map((p) => p.id), window: base.window, values: values(base) }));
  if (f.coversOnHand && tender.length > 0) {
    const pids = [...new Set(tender.map((p) => p.parcelId))]; const n = nightsOf(pids);
    out.push(blank({ rule_id: 'FROST', kind: 'recommendation', category: 'cover', confidence: 'low', parcel_ids: pids, planting_ids: tender.map((p) => p.id), window: n.window, values: { ...values(n), cover_gain_range_c: [...f.params.coverGainC], cover_gain_basis: 'EST' } }));
  }
  if (f.thaw) {
    const held = new Set(phi(s).flatMap((o) => o.vetoes.map((v) => v.planting_id)));
    for (const planting of guard) {
      const harvestFrom = f.thaw.harvestFromByPlanting[planting.id];
      if (held.has(planting.id)) continue;
      const base = { rule_id: 'FROST', parcel_ids: [planting.parcelId], planting_ids: [planting.id] };
      const unknown = () => blank({ ...base, kind: 'info', category: 'thaw_unknown', values: { badge: 'unknown' } });
      if (!harvestFrom || !isCalendarDate(harvestFrom)) { out.push(unknown()); continue; }
      const days = hit.find((x) => x.id === planting.parcelId)?.hits.map((h) => h.night.to).filter((day) => day >= harvestFrom) ?? [];
      if (!days.length) continue;
      const thawAt = thawMornings(f.thaw, planting.parcelId, days, f.params.leafBelowAirC[1]);
      if (!thawAt) { out.push(unknown()); continue; }
      const times = Object.values(thawAt).sort();
      out.push(blank({ ...base, kind: 'recommendation', category: 'no_harvest_before_thaw', confidence: 'low',
        window: { start: times[0], end: times[times.length - 1] },
        values: { thaw_at: thawAt, phi_clear: true, harvest_from: harvestFrom, modeled: true } }));
    }
  } else if (guard.length > 0) {
    const pids = [...new Set(guard.map((p) => p.parcelId))]; const n = nightsOf(pids);
    out.push(blank({ rule_id: 'FROST', kind: 'recommendation', category: 'no_harvest_before_thaw', confidence: 'low', parcel_ids: pids, planting_ids: guard.map((p) => p.id), window: n.window, values: values(n) }));
  }
  return out;
}

function salinity(s: Snapshot): Output[] {
  const facts = s.salinity;
  if (!facts) return [];
  return facts.samples.flatMap((sample) => {
    const base = { rule_id: 'SALT', parcel_ids: [sample.parcelId] };
    const inputs = { water_EC_dS_m: sample.waterEcDsM, sampled_on: sample.sampledOn, coastal_well: sample.coastalWell };
    if (s.ruleStatus.SALT !== 'signed') {
      return [blank({ ...base, kind: 'info', category: 'salinity_inputs', values: { ...inputs, badge: 'not_signed_off' } })];
    }
    const reading = salinityReading(sample, s.asOf, facts.retestMonths);
    if (!reading) {
      return [blank({ ...base, kind: 'info', category: 'salinity_unknown', values: { ...inputs, badge: 'unknown' } })];
    }
    const sensitive = s.plantings.filter((p) => p.parcelId === sample.parcelId && facts.sensitiveCrops.includes(p.cropId));
    const values = { ...inputs, water_class: reading.waterClass, retest_prompt: reading.retest, sensitive_planting_ids: sensitive.map((p) => p.id) };
    if (reading.waterClass === 'none' || sensitive.length === 0) {
      return [blank({ ...base, kind: 'info', category: 'salinity_reading', confidence: reading.confidence, values })];
    }
    return [blank({ ...base, kind: 'alert', category: 'salinity', confidence: reading.confidence,
      severity: reading.waterClass === 'severe' ? 'medium' : 'low', planting_ids: sensitive.map((p) => p.id), values })];
  });
}

/** STOCK: low stock before the next planned spray (a block when it is not even enough), expired and soon-to-expire lots. Needs signed thresholds; never notifies yet. */
function stock(s: Snapshot): Output[] {
  if (s.ruleStatus.STOCK !== 'signed' || !s.stock) return [];
  const sev = { stock_low: 'medium', stock_insufficient: 'high', stock_expired: 'low', stock_expiring: 'low' } as const;
  return stockHits(s.stock, s.asOf).map((h) => blank({ rule_id: 'STOCK', kind: h.category === 'stock_insufficient' ? 'block' : 'alert', category: h.category, severity: sev[h.category], product_ids: [h.productId], values: h.values }));
}

/** A rule with unsigned thresholds only shows what it would look at. Never an alert, never a severity, never a notification. */
function infoOnly(s: Snapshot): Output[] {
  const frost = s.ruleStatus.FROST === 'unsigned' ? s.parcelsForInfo.map((id) => blank({ rule_id: 'FROST', kind: 'info', category: 'frost_inputs', parcel_ids: [id], values: { shows_inputs: true, badge: 'not_signed_off', notify: false } })) : [];
  const spray = s.ruleStatus['SPRAY-WIN'] === 'unsigned' ? Object.keys(s.weather?.hours ?? {}).map((id) => blank({ rule_id: 'SPRAY-WIN', kind: 'info', category: 'spray_window_inputs', parcel_ids: [id], values: { shows_inputs: true, badge: 'not_signed_off', notify: false } })) : [];
  const stockInfo = s.ruleStatus.STOCK === 'unsigned' ? [...new Set((s.stock?.lots ?? []).map((l) => l.productId))].map((id) => blank({ rule_id: 'STOCK', kind: 'info', category: 'stock_inputs', product_ids: [id], values: { shows_inputs: true, badge: 'not_signed_off', notify: false } })) : [];
  return [...frost, ...spray, ...stockInfo];
}

export function runRules(s: Snapshot): Output[] {
  // no readable «now»: everything is blocked, said out loud; never an empty list that reads as «all clear»
  if (!parseInstant(s.asOf).known) return [blank({ rule_id: 'ENGINE', kind: 'block', category: 'now_unreadable', severity: 'high', vetoes: [{ by: 'ENGINE', vetoed: 'everything', reason: 'unreadable_now' }] })];
  const gaps = s.gap ? gapOutputs(s.gap, s.asOf, s.ruleStatus.GAP === 'signed') : [];
  const doses = s.doseChecks ? registrationDose(s, s.doseChecks).map((result) => blank({ rule_id: 'REG', ...result })) : [];
  return [...doses, ...phi(s), ...harvestGuard(s).map(blank), ...rei(s), ...reg(s), ...rot(s), ...sprayWindowClosed(s), ...frost(s), ...salinity(s), ...stock(s), ...gaps.map((gap) => blank({ rule_id: 'GAP', ...gap })), ...infoOnly(s)];
}
