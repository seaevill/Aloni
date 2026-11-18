import { known, unknown, type Known } from './known';

declare const brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [brand]: B };

/** A non-negative decimal kept as TEXT in canonical form («0.025»): every typed digit survives, trailing zeros included. */
export type Decimal = Brand<string, 'Decimal'>;

/**
 * Greek decimal input, never guessed. The comma is the decimal separator. Accepted: «0,025», «0.025», «12,5», «7».
 * Rejected as invalid (could be read two ways or is not a plain number): «1.000», «1,000», «1,000.5», «1e3», «-1», «abc».
 * Nothing typed = unknown('missing').
 */
export function parseDecimal(input: string): Known<Decimal> {
  const s = input.trim();
  if (s === '') return unknown('missing');
  const m = /^(\d+)(?:([.,])(\d+))?$/.exec(s);
  if (!m) return unknown('invalid');
  const [, int, sep, frac] = m;
  if (sep !== undefined && frac.length === 3 && int !== '0') return unknown('invalid'); // «1.000»: thousands or decimals?
  return known((sep === undefined ? int : `${int}.${frac}`) as Decimal);
}

/** Exact comparison by scaled integers (no floating point). */
export function compareDecimal(a: Decimal, b: Decimal): -1 | 0 | 1 {
  const [ai, af = ''] = a.split('.');
  const [bi, bf = ''] = b.split('.');
  const scale = Math.max(af.length, bf.length);
  const x = BigInt(ai + af.padEnd(scale, '0'));
  const y = BigInt(bi + bf.padEnd(scale, '0'));
  return x < y ? -1 : x > y ? 1 : 0;
}

const scaled = (d: Decimal) => { const [i, f = ''] = d.split('.'); return { n: BigInt(i + f), scale: f.length }; };
const canonical = (n: bigint, scale: number): Decimal => {
  const digits = n.toString().padStart(scale + 1, '0');
  const int = digits.slice(0, digits.length - scale); const frac = digits.slice(digits.length - scale).replace(/0+$/, '');
  return (frac === '' ? int : `${int}.${frac}`) as Decimal;
};
/** Exact product (no floating point, no rounding): «1.5» × «0.06» = «0.09». */
export function mulDecimal(a: Decimal, b: Decimal): Decimal { const x = scaled(a); const y = scaled(b); return canonical(x.n * y.n, x.scale + y.scale); }
/** Exact sum. */
export function addDecimal(a: Decimal, b: Decimal): Decimal {
  const x = scaled(a); const y = scaled(b); const scale = Math.max(x.scale, y.scale);
  return canonical(x.n * 10n ** BigInt(scale - x.scale) + y.n * 10n ** BigInt(scale - y.scale), scale);
}

/** A whole, non-negative number (PHI days, REI hours, max applications). */
export function parseWhole<B extends string>(input: string): Known<Brand<number, B>> {
  const s = input.trim();
  if (s === '') return unknown('missing');
  return /^\d{1,4}$/.test(s) ? known(parseFloat(s) as Brand<number, B>) : unknown('invalid');
}
