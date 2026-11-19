import { compareDecimal, known, parseDecimal, parseInstant, parsePhiDays, parseReiHours, phiEnd, reiEnd, type Decimal, type DoseUnit } from '@aloni/rules-core';
import type { Row } from '../db/schema';
import { DOSE_UNITS, NOT_ON_LABEL, readUse, signedUseOf, statusOf } from '../labels/label-use';
import { sumSigned } from '../stock/balance';
import { buildAdjustment, flagsOf } from '../stock/stock';
import { exceedsMax } from './apps';

// A spray RECORD says what really happened. It is never refused because the label is weak (the legal record must not be lost): the weakness is
// marked on the record and the waiting period (PHI) of an unsigned or incomplete label is UNKNOWN until Bora enters the label's values (amending row).
// PHI/REI come only from phiEnd/reiEnd and only from a SignedLabelUse. Typed quantities are kept as typed; nothing is converted or rounded.

export type Flag = 'label_none' | 'label_blocked' | 'label_unsigned' | 'label_changed' | 'dose_outside_label' | 'dose_unit_differs' | 'lot_expired' | 'stock_negative' | 'late_entry' | 'max_apps_exceeded';
export interface SprayInput {
  plantingIds: readonly string[]; productId: string; applicatorId: string; sprayedAt: string;
  dose: string; doseUnit: DoseUnit | undefined; lotKey: string | undefined; qty: string; water: string; note: string;
  /** «Λόγος καθυστέρησης»: required when the end time is more than LATE_AFTER_DAYS before the record. */
  lateReason?: string;
  /** Why one more application passes the signed label's maximum (required then). */
  overReason?: string;
}
export interface SprayContext { /** Sprays of this product already in force on the most-sprayed chosen planting. */ priorApps?: number; label: Row | undefined; plantings: readonly Row[]; lot: Row | undefined; lotBalance: string | undefined; today: string; /** Demo seed only: history is written without a reason. */ historic?: true }
/** An end time older than this (before the record) is a LATE entry: allowed (a forgotten spraying must still reach the legal record), but it needs a reason and is marked. */
export const LATE_AFTER_DAYS = 7;
export const isLate = (sprayedAt: string, nowIso: string): boolean => Date.parse(sprayedAt) < Date.parse(nowIso) - LATE_AFTER_DAYS * 86400000;
export interface SprayErrors { plantings: boolean; product: boolean; applicator: boolean; time: boolean; dose: boolean; doseUnit: boolean; qty: boolean; water: boolean; lateReason: boolean; overReason: boolean }
export type SprayResult =
  | { ok: true; job: Row; jobPlantings: Row[]; spray: Row; movement: Row | undefined; flags: Flag[] }
  | { ok: false; errors: SprayErrors };
export interface Ids { job: string; spray: string; movement: string; plantingLinks: readonly string[] }

const positive = (s: string): Decimal | undefined => { const p = parseDecimal(s); return p.known && compareDecimal(p.value, '0' as Decimal) > 0 ? p.value : undefined; };
const LABEL_FLAG: Record<'none' | 'blocked' | 'unsigned' | 'changed', Flag> = { none: 'label_none', blocked: 'label_blocked', unsigned: 'label_unsigned', changed: 'label_changed' };

export function buildSpray(input: SprayInput, ctx: SprayContext, farmId: string, nowIso: string, ids: Ids): SprayResult {
  const dose = positive(input.dose);
  const qty = input.qty.trim() === '' ? undefined : positive(input.qty);
  const water = input.water.trim() === '' ? undefined : parseDecimal(input.water);
  const errors: SprayErrors = {
    plantings: input.plantingIds.length === 0, product: !input.productId, applicator: !input.applicatorId, time: !parseInstant(input.sprayedAt).known,
    dose: !dose, doseUnit: !input.doseUnit || !DOSE_UNITS.includes(input.doseUnit),
    qty: (input.qty.trim() !== '' && !qty) || (input.lotKey !== undefined && !qty), // a lot needs the quantity taken from it; a typed quantity must be readable
    water: water !== undefined && !water.known,
    lateReason: !ctx.historic && parseInstant(input.sprayedAt).known && isLate(input.sprayedAt, nowIso) && (input.lateReason ?? '').trim() === '',
    overReason: false,
  };
  const late = !ctx.historic && parseInstant(input.sprayedAt).known && isLate(input.sprayedAt, nowIso);
  const labelNow = ctx.label && ctx.label.product_id === input.productId && ctx.plantings.every((p) => p.crop_id === ctx.label?.crop_id) ? ctx.label : undefined;
  const over = !ctx.historic && ctx.priorApps !== undefined && exceedsMax(labelNow, ctx.priorApps); // no count given = not judged (never assumed 0)
  errors.overReason = over && (input.overReason ?? '').trim() === '';
  if (Object.values(errors).some(Boolean) || !dose || !input.doseUnit) return { ok: false, errors };

  const flags: Flag[] = [];
  const label = ctx.label && ctx.label.product_id === input.productId && ctx.plantings.every((p) => p.crop_id === ctx.label?.crop_id) ? ctx.label : undefined;
  const state = label ? statusOf(label) : 'none';
  if (state !== 'signed') flags.push(LABEL_FLAG[state]);
  if (late) flags.push('late_entry');
  if (over) flags.push('max_apps_exceeded');
  const signed = label ? signedUseOf(label) : undefined;

  if (label) { // dose against the label's own dose, when the label has one in the same unit
    const u = readUse(label);
    if (u.dose.known) {
      if (u.dose.value.unit !== input.doseUnit) flags.push('dose_unit_differs');
      else if (compareDecimal(dose, u.dose.value.min) < 0 || compareDecimal(dose, u.dose.value.max) > 0) flags.push('dose_outside_label');
    }
  }
  const spray: Row = {
    id: ids.spray, farm_id: farmId, job_id: ids.job, product_id: input.productId, applicator_id: input.applicatorId, sprayed_at: input.sprayedAt,
    dose_str: dose, dose_unit: input.doseUnit, label_state: state, created_at: nowIso,
    ...(label ? { label_use_id: label.id } : {}), ...(input.lotKey ? { lot_key: input.lotKey } : {}), ...(qty ? { qty_str: qty } : {}),
    ...(water?.known ? { water_l: water.value } : {}), ...(input.note.trim() || over ? { note: [input.note.trim(), over ? `[max_apps] ${(input.overReason ?? '').trim()}` : ''].filter(Boolean).join('\n') } : {}),
    ...(late ? { late_reason: (input.lateReason ?? '').trim() } : {}),
  };
  if (signed?.known) { // only a SignedLabelUse feeds the waiting periods
    const end = phiEnd(input.sprayedAt, known(signed.value.phiDays));
    const re = reiEnd(input.sprayedAt, known(signed.value.reiHours));
    spray.phi_days = String(signed.value.phiDays); spray.rei_hours = String(signed.value.reiHours); spray.phi_source = 'label';
    if (end.known) spray.phi_until = end.value;
    if (re.known) spray.rei_until = re.value;
  }
  let movement: Row | undefined;
  if (input.lotKey && qty) {
    const m = buildAdjustment({ lotKey: input.lotKey, productId: input.productId, direction: 'out', qty: input.qty, reason: 'spray', amendsId: undefined }, farmId, nowIso, ids.movement);
    if (m.ok) movement = { ...m.movement, job_id: ids.job };
    if (ctx.lot && flagsOf(ctx.lot, ctx.lotBalance, ctx.today, { known: false, reason: 'missing' }).expired) flags.push('lot_expired');
    if (ctx.lotBalance === undefined || sumSigned([{ qty: ctx.lotBalance.replace('-', ''), sign: ctx.lotBalance.startsWith('-') ? -1 : 1 }, { qty, sign: -1 }]).startsWith('-')) flags.push('stock_negative');
  }
  spray.flags = flags;
  const job: Row = { id: ids.job, farm_id: farmId, kind: 'spray', status: 'done', product_id: input.productId, worker_id: input.applicatorId, done_at: input.sprayedAt, created_at: nowIso, updated_at: nowIso, deleted_at: null, ...(label ? { label_use_id: label.id } : {}) };
  const jobPlantings = input.plantingIds.map((pid, i) => ({ id: ids.plantingLinks[i], farm_id: farmId, job_id: ids.job, planting_id: pid, area_str_treated: ctx.plantings.find((p) => p.id === pid)?.area_str, created_at: nowIso }));
  return { ok: true, job, jobPlantings, spray, movement, flags };
}

/** The record in force for each job: the newest row, an amending row replacing the one it amends. */
export function effectiveSprays(rows: readonly Row[]): Row[] {
  const amended = new Set(rows.map((r) => r.amends_id).filter((x): x is string => typeof x === 'string'));
  return rows.filter((r) => !amended.has(r.id));
}

/** A waiting period typed by Bora from the label, for a spray whose PHI is unknown: a NEW row, the original stays. Only offered while the PHI is unknown, so it can never shorten a known one. */
export type WaitEntry = { ok: true; row: Row } | { ok: false; phi: boolean; rei: boolean; known: boolean; reason: boolean };
/** Bora's entry of the label's waiting periods is a NEW row that amends the original; it says WHY (a correction always has a reason: who, when and why stay traceable). */
export function buildWaitEntry(original: Row, phiText: string, reiText: string, nowIso: string, id: string, reason: string): WaitEntry {
  const phi = parsePhiDays(phiText);
  const rei = parseReiHours(reiText);
  const hasPhi = typeof original.phi_days === 'string' && original.phi_days !== NOT_ON_LABEL;
  if (hasPhi || !phi.known || !rei.known || reason.trim() === '') return { ok: false, phi: !phi.known, rei: !rei.known, known: hasPhi, reason: reason.trim() === '' };
  const sprayedAt = String(original.sprayed_at);
  const pe = phiEnd(sprayedAt, phi);
  const re = reiEnd(sprayedAt, rei);
  const { phi_until: _a, rei_until: _b, ...rest } = original;
  return { ok: true, row: { ...rest, id, amends_id: original.id, phi_days: phiText.trim(), rei_hours: reiText.trim(), phi_source: 'manual', amend_reason: reason.trim(), created_at: nowIso, ...(pe.known ? { phi_until: pe.value } : {}), ...(re.known ? { rei_until: re.value } : {}) } };
}
