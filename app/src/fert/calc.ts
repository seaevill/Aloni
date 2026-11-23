import { mulDecimal, parseDecimal, type Decimal } from '@aloni/rules-core';
import type { PlanItem } from './plan';

// «Λιπάσματος ποσότητα»: the kilos for a planting = the amount the agronomist wrote (kg per στρέμμα) × the planting's area, exactly; bags = kilos ÷ the bag size the grower typed, counted up.
// Both numbers are the grower's; the app proposes none. No amount or no area = unknown with the reason, never 0.
export type FertCalc =
  | { known: false; reason: 'no-amount' | 'no-area' }
  | { known: true; kg: string; bags: { known: true; count: string } | { known: false } };

const positive = (s: string | undefined): Decimal | undefined => {
  if (s === undefined) return undefined;
  const d = parseDecimal(s);
  return d.known && /[1-9]/.test(d.value) ? d.value : undefined;
};
const split = (d: Decimal): { n: bigint; scale: number } => { const [i = '', f = ''] = d.split('.'); return { n: BigInt(`${i}${f}`), scale: f.length }; };
/** ceil(kg / bag) in exact integer arithmetic. */
function bagCount(kg: Decimal, bag: Decimal): string {
  const a = split(kg); const b = split(bag);
  const num = a.n * 10n ** BigInt(Math.max(0, b.scale - a.scale)); const den = b.n * 10n ** BigInt(Math.max(0, a.scale - b.scale));
  return ((num + den - 1n) / den).toString();
}

export function fertCalc(item: Pick<PlanItem, 'kg_per_str' | 'bag_kg'>, areaStr: string): FertCalc {
  const amount = positive(item.kg_per_str);
  if (amount === undefined) return { known: false, reason: 'no-amount' };
  const area = positive(areaStr);
  if (area === undefined) return { known: false, reason: 'no-area' };
  const kg = mulDecimal(amount, area);
  const bag = positive(item.bag_kg);
  return { known: true, kg, bags: bag === undefined ? { known: false } : { known: true, count: bagCount(kg, bag) } };
}
