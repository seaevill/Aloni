import {
  compareDecimal, fingerprint, isCalendarDate, known, makeDose, notOnLabel, parseDecimal, parseMaxApps, parsePhiDays, parseReiHours, requireSignOff, unknown,
  type Decimal, type DoseKind, type DoseUnit, type Known, type LabelUse, type SignedLabelUse, type SignOff,
} from '@aloni/rules-core';
import type { Row } from '../db/schema';

// A label use = what the label says for ONE product on ONE crop. Every value is in exactly one of three states: empty (not yet entered),
// entered (kept as typed, digits exact) or «δεν αναγράφεται» (the label does not say). Empty and «not on label» are both BLOCKED. Nothing is ever defaulted.

export const NOT_ON_LABEL = 'not_on_label';
export const KINDS: readonly DoseKind[] = ['single', 'range'];
export const DOSE_UNITS: readonly DoseUnit[] = ['ml/str', 'g/str', 'l/str', 'kg/str', 'ml/100l', 'g/100l']; // provisional (DECISIONS.md): no other unit, no conversion
export type FieldName = 'doseMin' | 'doseMax' | 'phi' | 'rei' | 'maxApps';
/** What the farmer sees for one value: an empty box, a typed text, or the «δεν αναγράφεται» switch. */
export interface Field { notOnLabel: boolean; text: string }
export interface LabelUseInput {
  productId: string; cropId: string; target: string; source: string;
  kind: DoseKind | undefined; unit: DoseUnit | undefined;
  doseMin: Field; doseMax: Field; phi: Field; rei: Field; maxApps: Field;
}
export type LabelUseResult =
  | { ok: true; row: Row }
  | { ok: false; product: boolean; crop: boolean; invalid: ReadonlySet<FieldName | 'range'> };

const PARSE: Record<FieldName, (s: string) => Known<unknown>> = { doseMin: parseDecimal, doseMax: parseDecimal, phi: parsePhiDays, rei: parseReiHours, maxApps: parseMaxApps };
const ROW_KEY: Record<FieldName, string> = { doseMin: 'dose_min', doseMax: 'dose_max', phi: 'phi_days', rei: 'rei_hours', maxApps: 'max_apps' };

/** What gets stored for one value: the marker, the text as typed (decimals in their canonical form), or nothing. undefined + invalid=true = refused. */
function stored(name: FieldName, f: Field): { value: string | undefined; invalid: boolean } {
  if (f.notOnLabel) return { value: NOT_ON_LABEL, invalid: false };
  if (f.text.trim() === '') return { value: undefined, invalid: false };
  const p = PARSE[name](f.text);
  if (!p.known || ((name === 'doseMin' || name === 'doseMax') && compareDecimal(p.value as Decimal, '0' as Decimal) <= 0)) return { value: undefined, invalid: true }; // a dose of 0 is refused
  return { value: name === 'doseMin' || name === 'doseMax' ? String(p.value) : f.text.trim(), invalid: false };
}

/**
 * Builds the row. Incomplete is allowed (it is simply blocked); a value that is typed but unreadable («1.000», «7,5») is refused, never guessed.
 * A row built here never carries a sign-off: editing a label drops it (it is recorded again separately).
 */
export function buildLabelUse(input: LabelUseInput, farmId: string, nowIso: string, id: string, createdAt: string = nowIso): LabelUseResult {
  const invalid = new Set<FieldName | 'range'>();
  const row: Row = { id, farm_id: farmId, product_id: input.productId, crop_id: input.cropId, created_at: createdAt, updated_at: nowIso, deleted_at: null };
  const fields: FieldName[] = input.kind === 'single' ? ['doseMin', 'phi', 'rei', 'maxApps'] : ['doseMin', 'doseMax', 'phi', 'rei', 'maxApps']; // single = one box: no second dose is kept
  for (const name of fields) {
    const s = stored(name, input[name]);
    if (s.invalid) invalid.add(name);
    else if (s.value !== undefined) row[ROW_KEY[name]] = s.value;
  }
  if (input.kind) row.dose_kind = input.kind;
  if (input.unit) row.dose_unit = input.unit;
  if (input.target.trim()) row.target = input.target.trim();
  if (input.source.trim()) row.source = input.source.trim();
  if (invalid.size === 0 && input.kind === 'range' && !readUse(row).dose.known && typeof row.dose_min === 'string' && typeof row.dose_max === 'string' && row.dose_min !== NOT_ON_LABEL && row.dose_max !== NOT_ON_LABEL) invalid.add('range'); // min above max
  if (!input.productId || !input.cropId || invalid.size > 0) return { ok: false, product: !input.productId, crop: !input.cropId, invalid };
  return { ok: true, row };
}

/** The stored row back into the form: decimals in the farmer's comma form, «not on label» as the switch, the rest as stored. */
export function toInput(row: Row): LabelUseInput {
  const field = (key: string): Field => {
    const v = typeof row[key] === 'string' ? (row[key] as string) : '';
    return v === NOT_ON_LABEL ? { notOnLabel: true, text: '' } : { notOnLabel: false, text: v.split('.').join(',') };
  };
  return {
    productId: String(row.product_id), cropId: String(row.crop_id), target: typeof row.target === 'string' ? row.target : '', source: typeof row.source === 'string' ? row.source : '',
    kind: KINDS.find((k) => k === row.dose_kind), unit: DOSE_UNITS.find((u) => u === row.dose_unit),
    doseMin: field('dose_min'), doseMax: field('dose_max'), phi: field('phi_days'), rei: field('rei_hours'), maxApps: field('max_apps'),
  };
}

const text = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const valueOf = <T,>(parse: (s: string) => Known<T>, v: unknown): Known<T> => {
  const s = text(v);
  if (s === undefined) return unknown('missing');
  return s === NOT_ON_LABEL ? notOnLabel() : parse(s);
};

/** The stored row as label values. Anything missing, «not on label» or unreadable is unknown. */
export function readUse(row: Row): LabelUse {
  const kind = (KINDS as readonly string[]).includes(text(row.dose_kind) ?? '') ? known(row.dose_kind as DoseKind) : unknown('missing');
  const unit = (DOSE_UNITS as readonly string[]).includes(text(row.dose_unit) ?? '') ? known(row.dose_unit as DoseUnit) : unknown('missing');
  return {
    scope: JSON.stringify([row.product_id, row.crop_id, text(row.target) ?? '']), // what the label is FOR: the approval covers it too
    dose: makeDose(kind, unit, valueOf(parseDecimal, row.dose_min), valueOf(parseDecimal, row.dose_max)),
    phiDays: valueOf(parsePhiDays, row.phi_days),
    reiHours: valueOf(parseReiHours, row.rei_hours),
    maxApps: valueOf(parseMaxApps, row.max_apps),
  };
}

export type Status = 'blocked' | 'unsigned' | 'changed' | 'signed';
const signOffOf = (row: Row): SignOff | undefined => {
  const s = row.sign_off as Partial<SignOff> | undefined;
  return s && typeof s.by === 'string' && typeof s.on === 'string' && typeof s.fingerprint === 'string' ? { by: s.by, on: s.on, fingerprint: s.fingerprint } : undefined;
};

/** blocked = a value is missing / not on the label / unreadable; unsigned = complete, nobody approved it («Μη εγκεκριμένο»); changed = approved, then edited; signed = approved exactly as it is. */
export function statusOf(row: Row): Status {
  const use = readUse(row);
  if (!use.dose.known || !use.phiDays.known || !use.reiHours.known || !use.maxApps.known) return 'blocked';
  const so = signOffOf(row);
  if (!so) return 'unsigned';
  return requireSignOff(use, so).known ? 'signed' : 'changed';
}

/** The ONLY way for deciding code to get label values: signed, complete and unchanged, or unknown (blocked). */
export const signedUseOf = (row: Row): Known<SignedLabelUse> => requireSignOff(readUse(row), signOffOf(row));

/** Records the agronomist's sign-off for exactly the values in the row. Only a complete, unsigned label with a name and a real date can be signed. */
export function withSignOff(row: Row, by: string, on: string, nowIso: string): Row | undefined {
  if (statusOf(row) === 'blocked' || !by.trim() || !isCalendarDate(on)) return undefined;
  return { ...row, sign_off: { by: by.trim(), on, fingerprint: fingerprint(readUse(row)) }, updated_at: nowIso };
}


/**
 * A SIGNED label use never changes (migration 0019): a change is a NEW label use that names the one it replaces and says why; the old one is archived. Returns undefined when the reason is empty.
 * The replacement carries NO signature (it must be signed again by the agronomist).
 */
export function supersede(old: Row, next: Row, reason: string, nowIso: string): { archivedOld: Row; replacement: Row } | undefined {
  const why = reason.trim();
  if (why === '') return undefined;
  const { sign_off: _signature, ...rest } = next;
  return { archivedOld: { ...old, deleted_at: nowIso, updated_at: nowIso }, replacement: { ...rest, supersedes_id: old.id, change_reason: why } };
}

/** The values a spray relies on. Once a spray used the label use (or it is signed) these can only change through a NEW label use (migrations 0019/0020). */
const SAFETY_COLUMNS = ['product_id', 'crop_id', 'dose_kind', 'dose_unit', 'dose_min', 'dose_max', 'phi_days', 'rei_hours', 'max_apps'] as const;
export const safetyChanged = (a: Row, b: Row): boolean => SAFETY_COLUMNS.some((k) => (a[k] ?? null) !== (b[k] ?? null));

/** Editing an unsigned replacement in place keeps its link to the label use it replaces and the reason (the phone sends the whole row; the server empties what is missing). */
export function keepLinks(existing: Row, row: Row): Row {
  const kept: Row = { ...row };
  if (existing.supersedes_id !== undefined && existing.supersedes_id !== null) kept.supersedes_id = existing.supersedes_id;
  if (existing.change_reason !== undefined && existing.change_reason !== null) kept.change_reason = existing.change_reason;
  return kept;
}
