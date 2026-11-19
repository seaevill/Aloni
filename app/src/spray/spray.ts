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
  /** The START of the spraying (REQUIRED, Reg. 2023/564 «start time»): an instant, never later than the end. */
  startedAt?: string;
  /** BBCH growth stage, two digits 00–99, optional («where relevant»). */
  bbch?: string;
  /** Prescription number (Greek professional use), optional. */
  prescription?: string;
  /** Tank mix: every product of one mix is its own record; they share this id (0026). */
  mixId?: string;
  /** «Λόγος καθυστέρησης»: required when the end time is more than LATE_AFTER_DAYS before the record. */
  lateReason?: string;
  /** Why one more application passes the signed label's maximum (required then). */
  overReason?: string;
  /** Why a dose outside the label's own range (or in another unit) is used (required then). */
  doseReason?: string;
}
export interface SprayContext { /** A worker's «Έγινε» (the RPC knows only the end time) and the demo seed carry no start: it is then left EMPTY and the audit export asks to fill it in. */ startOptional?: boolean; /** Sprays of this product already in force on the most-sprayed chosen planting. */ priorApps?: number; label: Row | undefined; plantings: readonly Row[]; lot: Row | undefined; lotBalance: string | undefined; today: string; /** Demo seed only: history is written without a reason. */ historic?: true }
/** An end time older than this (before the record) is a LATE entry: allowed (a forgotten spraying must still reach the legal record), but it needs a reason and is marked. */
export const LATE_AFTER_DAYS = 7;
export const isLate = (sprayedAt: string, nowIso: string): boolean => Date.parse(sprayedAt) < Date.parse(nowIso) - LATE_AFTER_DAYS * 86400000;
export interface SprayErrors { start: boolean; bbch: boolean; plantings: boolean; mixedCrops: boolean; product: boolean; applicator: boolean; time: boolean; dose: boolean; doseUnit: boolean; qty: boolean; water: boolean; lateReason: boolean; overReason: boolean; doseReason: boolean }
export type SprayResult =
  | { ok: true; job: Row; jobPlantings: Row[]; spray: Row; movement: Row | undefined; flags: Flag[] }
  | { ok: false; errors: SprayErrors };
/** true when the label has a dose and this one is outside its range or typed in another unit: never refused (it really happened), but a REASON is required and it is marked. */
export function doseOutsideLabel(label: Row | undefined, dose: Decimal, unit: DoseUnit): boolean {
  if (!label) return false;
  const u = readUse(label);
  return u.dose.known && (u.dose.value.unit !== unit || compareDecimal(dose, u.dose.value.min) < 0 || compareDecimal(dose, u.dose.value.max) > 0);
}
export interface Ids { job: string; spray: string; movement: string; plantingLinks: readonly string[] }

const positive = (s: string): Decimal | undefined => { const p = parseDecimal(s); return p.known && compareDecimal(p.value, '0' as Decimal) > 0 ? p.value : undefined; };
const LABEL_FLAG: Record<'none' | 'blocked' | 'unsigned' | 'changed', Flag> = { none: 'label_none', blocked: 'label_blocked', unsigned: 'label_unsigned', changed: 'label_changed' };

/** A start is an instant the waiting-period code can read, and not later than the end. */
export const validStart = (start: string | undefined, end: string): boolean => start !== undefined && parseInstant(start).known && parseInstant(end).known && Date.parse(start) <= Date.parse(end);

export function buildSpray(input: SprayInput, ctx: SprayContext, farmId: string, nowIso: string, ids: Ids): SprayResult {
  const dose = positive(input.dose);
  const qty = input.qty.trim() === '' ? undefined : positive(input.qty);
  const water = input.water.trim() === '' ? undefined : parseDecimal(input.water);
  const errors: SprayErrors = {
    start: ctx.startOptional === true && (input.startedAt === undefined || input.startedAt === '') ? false : !validStart(input.startedAt, input.sprayedAt), bbch: (input.bbch ?? '').trim() !== '' && !/^[0-9]{2}$/.test((input.bbch ?? '').trim()),
    plantings: input.plantingIds.length === 0, mixedCrops: new Set(ctx.plantings.map((p) => p.crop_id)).size > 1, product: !input.productId, applicator: !input.applicatorId, time: !parseInstant(input.sprayedAt).known,
    dose: !dose, doseUnit: !input.doseUnit || !DOSE_UNITS.includes(input.doseUnit),
    qty: (input.qty.trim() !== '' && !qty) || (input.lotKey !== undefined && !qty), // a lot needs the quantity taken from it; a typed quantity must be readable
    water: water !== undefined && !water.known,
    lateReason: !ctx.historic && parseInstant(input.sprayedAt).known && isLate(input.sprayedAt, nowIso) && (input.lateReason ?? '').trim() === '',
    overReason: false, doseReason: false,
  };
  const late = !ctx.historic && parseInstant(input.sprayedAt).known && isLate(input.sprayedAt, nowIso);
  const labelNow = ctx.label && ctx.label.product_id === input.productId && ctx.plantings.every((p) => p.crop_id === ctx.label?.crop_id) ? ctx.label : undefined;
  const over = !ctx.historic && ctx.priorApps !== undefined && exceedsMax(labelNow, ctx.priorApps); // no count given = not judged (never assumed 0)
  errors.overReason = over && (input.overReason ?? '').trim() === '';
  const outside = !ctx.historic && !!dose && !!input.doseUnit && doseOutsideLabel(labelNow, dose, input.doseUnit);
  errors.doseReason = outside && (input.doseReason ?? '').trim() === '';
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
    dose_str: dose, dose_unit: input.doseUnit, label_state: state, created_at: nowIso, ...(input.startedAt ? { started_at: input.startedAt } : {}),
    ...(input.mixId ? { mix_id: input.mixId } : {}),
    ...((input.bbch ?? '').trim() ? { bbch: (input.bbch ?? '').trim() } : {}), ...((input.prescription ?? '').trim() ? { prescription_no: (input.prescription ?? '').trim() } : {}),
    ...(label ? { label_use_id: label.id } : {}), ...(input.lotKey ? { lot_key: input.lotKey } : {}), ...(qty ? { qty_str: qty } : {}),
    ...(water?.known ? { water_l: water.value } : {}), ...(input.note.trim() || over || outside ? { note: [input.note.trim(), over ? `[max_apps] ${(input.overReason ?? '').trim()}` : '', outside ? `[dose] ${(input.doseReason ?? '').trim()}` : ''].filter(Boolean).join('\n') } : {}),
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

// ---------------------------------------------------------------- correction of a record (migration 0023)
/** What the farmer may change in a recorded spraying. The job and the product never change (a wrong product = a new spraying). */
export interface CorrectionInput { dose: string; doseUnit: DoseUnit | undefined; sprayedAt: string; applicatorId: string; qty: string; water: string; note: string; reason: string; startedAt?: string; bbch?: string; prescription?: string }
export interface CorrectionContext { /** every stock movement of this phone: the spray's own «out» movement is found by its job */ movements: readonly Row[]; lotBalance: string | undefined }
export interface CorrectionErrors { start: boolean; bbch: boolean; dose: boolean; doseUnit: boolean; time: boolean; applicator: boolean; qty: boolean; water: boolean; reason: boolean; earlier: boolean }
export type CorrectionResult = { ok: true; spray: Row; movements: Row[] } | { ok: false; errors: CorrectionErrors };

/**
 * A correction is a NEW row that amends the one in force and says why; the original stays. Dose, unit, end time, applicator, quantity, water and note can change.
 * The waiting periods are recomputed from the stored days and the (new) end time, and can NEVER end earlier than the original's end (`earlier`). A known period never becomes unknown here
 * (the days are copied); an unknown one stays unknown (it is entered separately). A changed quantity moves the stock: the old quantity goes back in, the new one comes out.
 */
export function buildCorrection(original: Row, input: CorrectionInput, ctx: CorrectionContext, farmId: string, nowIso: string, ids: { spray: string; moveIn: string; moveOut: string }): CorrectionResult {
  const dose = positive(input.dose);
  const hasLot = typeof original.lot_key === 'string' && typeof original.qty_str === 'string';
  const qty = hasLot ? positive(input.qty) : undefined;
  const water = input.water.trim() === '' ? undefined : parseDecimal(input.water);
  const at = parseInstant(input.sprayedAt);
  const phiDays = typeof original.phi_days === 'string' && original.phi_days !== NOT_ON_LABEL ? parsePhiDays(original.phi_days) : undefined;
  const reiHours = typeof original.rei_hours === 'string' && original.rei_hours !== NOT_ON_LABEL ? parseReiHours(original.rei_hours) : undefined;
  const pe = at.known && phiDays ? phiEnd(input.sprayedAt, phiDays) : undefined;
  const re = at.known && reiHours ? reiEnd(input.sprayedAt, reiHours) : undefined;
  const before = (x: { known: boolean; value?: unknown } | undefined, old: unknown): boolean => x?.known === true && typeof x.value === 'string' && typeof old === 'string' && Date.parse(x.value) < Date.parse(old);
  const errors: CorrectionErrors = {
    start: input.startedAt !== undefined && !validStart(input.startedAt, input.sprayedAt), bbch: (input.bbch ?? '').trim() !== '' && !/^[0-9]{2}$/.test((input.bbch ?? '').trim()),
    dose: !dose, doseUnit: !input.doseUnit || !DOSE_UNITS.includes(input.doseUnit), time: !at.known, applicator: !input.applicatorId,
    qty: hasLot && !qty, water: water !== undefined && !water.known, reason: input.reason.trim() === '',
    earlier: before(pe as { known: boolean; value?: unknown } | undefined, original.phi_until) || before(re as { known: boolean; value?: unknown } | undefined, original.rei_until),
  };
  if (Object.values(errors).some(Boolean) || !dose || !input.doseUnit) return { ok: false, errors };

  const { phi_until: _p, rei_until: _r, note: _n, water_l: _w, received_at: _rc, started_at: _s, bbch: _b, prescription_no: _pn, ...rest } = original;
  const flags = (Array.isArray(original.flags) ? original.flags : []) as Flag[];
  const spray: Row = {
    ...rest, id: ids.spray, farm_id: farmId, amends_id: original.id, amend_reason: input.reason.trim(), created_at: nowIso,
    sprayed_at: input.sprayedAt, applicator_id: input.applicatorId, dose_str: dose, dose_unit: input.doseUnit,
    ...(hasLot && qty ? { qty_str: qty } : {}),
    ...(water?.known ? { water_l: water.value } : {}), ...(input.note.trim() ? { note: input.note.trim() } : {}),
    ...(input.startedAt !== undefined ? { started_at: input.startedAt } : typeof original.started_at === 'string' ? { started_at: original.started_at } : {}),
    ...((input.bbch ?? (typeof original.bbch === 'string' ? original.bbch : '')).trim() ? { bbch: (input.bbch ?? String(original.bbch)).trim() } : {}),
    ...((input.prescription ?? (typeof original.prescription_no === 'string' ? original.prescription_no : '')).trim() ? { prescription_no: (input.prescription ?? String(original.prescription_no)).trim() } : {}),
    ...(pe?.known ? { phi_until: pe.value } : typeof original.phi_until === 'string' && !pe ? { phi_until: original.phi_until } : {}),
    ...(re?.known ? { rei_until: re.value } : typeof original.rei_until === 'string' && !re ? { rei_until: original.rei_until } : {}),
    flags,
  };
  const movements: Row[] = [];
  const reversed = new Set(ctx.movements.filter((m) => m.reason === 'spray_correction').map((m) => m.amends_id)); // an «out» that a correction already took back is no longer in force
  const oldMove = hasLot ? ctx.movements.find((m) => m.job_id === original.job_id && m.direction === 'out' && m.reason === 'spray' && !reversed.has(m.id)) : undefined;
  if (hasLot && qty && oldMove && typeof oldMove.qty_str === 'string' && compareDecimal(qty, oldMove.qty_str as Decimal) !== 0) {
    const base = { farm_id: farmId, lot_key: oldMove.lot_key, product_id: oldMove.product_id, job_id: original.job_id, created_at: nowIso };
    movements.push({ ...base, id: ids.moveIn, direction: 'in', qty_str: oldMove.qty_str, reason: 'spray_correction', amends_id: oldMove.id });
    movements.push({ ...base, id: ids.moveOut, direction: 'out', qty_str: qty, reason: 'spray', amends_id: oldMove.id });
    const after = ctx.lotBalance === undefined ? undefined : sumSigned([
      { qty: ctx.lotBalance.replace('-', ''), sign: ctx.lotBalance.startsWith('-') ? -1 : 1 }, { qty: oldMove.qty_str, sign: 1 }, { qty, sign: -1 }]);
    if ((after === undefined || after.startsWith('-')) && !flags.includes('stock_negative')) spray.flags = [...flags, 'stock_negative'];
  }
  return { ok: true, spray, movements };
}
