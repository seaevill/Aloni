// The ONLY place that formats numbers (dose, quantity, area). It never rounds:
// the stored value is printed as it is, and only the decimal separator changes
// (comma in Greek/Turkish, dot in English). No thousands separator: «1.250» would be
// ambiguous next to the Greek decimal comma, and doses/quantities/areas are small.
// A value that is not a plain decimal (NaN, text, null) prints «— άγνωστο» = unknown = blocked,
// never a made-up number. Tests: app/tests/unit/format.test.ts.
import type { Decimal, Known } from '@aloni/rules-core';
import { lang, t } from './index';

const PLAIN = /^-?\d+(\.\d+)?$/;
const SCI = /^(-?)(\d+)(?:\.(\d+))?e([+-]\d+)$/;

/** Plain decimal text for a finite number, without losing digits (String(1e-7) = "1e-7" is expanded by string shifting, not by rounding). */
function numberToPlain(n: number): string | null {
  if (!Number.isFinite(n)) return null;
  const s = String(n);
  const m = SCI.exec(s);
  if (!m) return s;
  const [, sign, int, frac = '', exp] = m;
  const digits = int + frac;
  const shift = parseFloat(exp) + int.length;
  if (shift <= 0) return `${sign}0.${'0'.repeat(-shift)}${digits}`;
  if (shift >= digits.length) return `${sign}${digits}${'0'.repeat(shift - digits.length)}`;
  return `${sign}${digits.slice(0, shift)}.${digits.slice(shift)}`;
}

function plain(v: string | number | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const s = typeof v === 'number' ? numberToPlain(v) : v.trim();
  return s !== null && PLAIN.test(s) ? s : null;
}

const separator = () => (lang.value === 'en' ? '.' : ',');
const localise = (s: string) => s.replace('.', separator());

/** A dose exactly as stored: «0.625» → «0,625», «0.250» → «0,250» (trailing zeros are kept). Only a Known<Decimal> is accepted: an unknown dose prints «— άγνωστο». */
export function formatDose(v: Known<Decimal>): string {
  return v.known ? localise(v.value) : t('value.unknown');
}

/** A stock quantity or any other plain number, exactly as stored. */
export function formatQty(v: string | number | null | undefined): string {
  const s = plain(v);
  return s === null ? t('value.unknown') : localise(s);
}

/** An area in στρέμματα: 0.625 → «0,625 στρ.» (never rounded to 0,63). */
export function formatArea(v: string | number | null | undefined): string {
  const s = plain(v);
  if (s === null) return t('value.unknown');
  const unit = lang.value === 'el' ? 'στρ.' : lang.value === 'tr' ? 'dönüm' : 'str.';
  return `${localise(s)} ${unit}`;
}
