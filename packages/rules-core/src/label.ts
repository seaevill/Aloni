import { compareDecimal, parseWhole, type Brand, type Decimal } from './decimal';
import { known, unknown, type Known } from './known';
import { isCalendarDate } from './waits';

export type DoseKind = 'single' | 'range';
export type DoseUnit = 'ml/str' | 'g/str' | 'l/str' | 'kg/str' | 'ml/100l' | 'g/100l'; // provisional list (DECISIONS.md); never converted
export type PhiDays = Brand<number, 'PhiDays'>;
export type ReiHours = Brand<number, 'ReiHours'>;
export type MaxApps = Brand<number, 'MaxApps'>;
export const parsePhiDays = (s: string): Known<PhiDays> => parseWhole<'PhiDays'>(s);
export const parseReiHours = (s: string): Known<ReiHours> => parseWhole<'ReiHours'>(s);
export const parseMaxApps = (s: string): Known<MaxApps> => parseWhole<'MaxApps'>(s);

/** Dose as the farmer chose it: single = one value (min = max, chosen by him, not defaulted); range = both required, min <= max. */
export interface Dose { kind: DoseKind; unit: DoseUnit; min: Decimal; max: Decimal }

const ZERO = '0' as Decimal;
const positive = (d: Decimal) => compareDecimal(d, ZERO) > 0;

/** A dose of 0 is not a dose: it is invalid (blocked), never accepted. */
export function makeDose(kind: Known<DoseKind>, unit: Known<DoseUnit>, min: Known<Decimal>, max: Known<Decimal>): Known<Dose> {
  if (!kind.known || !unit.known) return unknown('missing'); // nothing preselected: no kind or no unit = blocked
  if (!min.known) return min;
  if (!positive(min.value)) return unknown('invalid');
  if (kind.value === 'single') return known({ kind: 'single', unit: unit.value, min: min.value, max: min.value });
  if (!max.known) return max;
  if (!positive(max.value)) return unknown('invalid');
  return compareDecimal(min.value, max.value) > 0 ? unknown('invalid') : known({ kind: 'range', unit: unit.value, min: min.value, max: max.value });
}

/** `scope` = WHAT the label is for (product, crop, target): the approval covers it too, so changing any of them drops the approval. */
export interface LabelUse { scope: string; dose: Known<Dose>; phiDays: Known<PhiDays>; reiHours: Known<ReiHours>; maxApps: Known<MaxApps> }

/** The agronomist's sign-off covers EXACTLY these values: any edit changes the fingerprint and the sign-off no longer matches. */
export interface SignOff { by: string; on: string; fingerprint: string }
export const fingerprint = (u: LabelUse): string => JSON.stringify([u.scope, u.dose, u.phiDays, u.reiHours, u.maxApps]);

declare const signed: unique symbol;
/** The ONLY input deciding code may accept. Obtained only from requireSignOff(). */
export type SignedLabelUse = { readonly [signed]: true; readonly dose: Dose; readonly phiDays: PhiDays; readonly reiHours: ReiHours; readonly maxApps: MaxApps };

export function requireSignOff(use: LabelUse, signOff: SignOff | undefined): Known<SignedLabelUse> {
  if (!signOff || signOff.by.trim() === '' || !isCalendarDate(signOff.on)) return unknown('missing'); // «Μη εγκεκριμένο»: no name, or no real date («Invalid Date»)
  if (signOff.fingerprint !== fingerprint(use)) return unknown('invalid'); // values edited after sign-off: the sign-off dropped
  if (!use.dose.known || !use.phiDays.known || !use.reiHours.known || !use.maxApps.known) return unknown('missing'); // any unknown value = blocked
  return known({ dose: use.dose.value, phiDays: use.phiDays.value, reiHours: use.reiHours.value, maxApps: use.maxApps.value } as SignedLabelUse);
}
