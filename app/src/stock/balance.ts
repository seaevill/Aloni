/** Exact decimal arithmetic on quantities kept as text («1.25»): a sum of signed quantities, with no floating point and no rounding. */
const scaleOf = (s: string): number => (s.split('.')[1] ?? '').length;
const scaled = (s: string, scale: number): bigint => { const [i, f = ''] = s.split('.'); return BigInt(i + f.padEnd(scale, '0')); };

/** Σ sign × qty, as a canonical decimal text: «1.75», «0», «-0.5» (a negative balance is shown, never hidden or clamped). */
export function sumSigned(items: ReadonlyArray<{ qty: string; sign: 1 | -1 }>): string {
  const scale = items.reduce((m, x) => Math.max(m, scaleOf(x.qty)), 0);
  const total = items.reduce((acc, x) => acc + (x.sign === 1 ? scaled(x.qty, scale) : -scaled(x.qty, scale)), 0n);
  const neg = total < 0n;
  const digits = (neg ? -total : total).toString().padStart(scale + 1, '0');
  const cut = digits.length - scale;
  let frac = digits.substring(cut);
  while (frac.endsWith('0')) frac = frac.substring(0, frac.length - 1); // 1.50 + 0.25 → 1.75; 2.5 − 2.5 → 0
  const text = frac ? `${digits.substring(0, cut)}.${frac}` : digits.substring(0, cut);
  return neg ? `-${text}` : text;
}

/** Sign of a canonical decimal text. */
export const signOf = (s: string): -1 | 0 | 1 => (s.startsWith('-') ? -1 : /^0(\.0+)?$/.test(s) ? 0 : 1);
