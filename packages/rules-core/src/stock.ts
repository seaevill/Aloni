// STOCK (RULES.md): what is on the shelf against what is planned and against the dates. PURE. Quantities are exact decimals (never rounded); a missing or unreadable
// input gives NO alert (it cannot be judged), never a guessed one. The thresholds (low factor, expiry days) are [SET]: while unsigned the rule only SHOWS its inputs.
import { addDecimal, compareDecimal, mulDecimal, type Decimal } from './decimal';
import type { Known } from './known';

export interface StockLot { productId: string; qty: Known<Decimal>; unit: string; expiry: string | undefined }
/** The next planned spray of a product: the area and the label dose per στρέμμα, in the product's unit (L, kg, g, ml). */
export interface PlannedUse { id: string; productId: string; areaStr: Known<Decimal>; dosePerStr: Known<Decimal>; doseUnit: string }
export interface StockFacts { lots: readonly StockLot[]; planned: readonly PlannedUse[]; labelDose: Readonly<Record<string, string>>; lowFactor: Known<Decimal>; expiringDays: number }
export interface StockHit { productId: string; category: 'stock_low' | 'stock_insufficient' | 'stock_expired' | 'stock_expiring'; values: Record<string, unknown> }

/** «YYYY-MM-DD» of an instant on the Athens clock (the farm's day). */
export const athensDate = (instantUtc: string): string => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(instantUtc));
const day = (d: string): number => Date.parse(`${d}T00:00:00Z`) / 86_400_000; // validated «YYYY-MM-DD» (an invalid date is NaN and compares false: no alert)
const validDate = (d: string | undefined): d is string => d !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));
const comma = (d: string) => d.replace('.', ',');

/** A lot that expires inside the window: the days left, and the label's own dose text as given (never rounded; the Greek comma only for display). */
function expiringHit(productId: string, expiry: string, qty: Decimal, unit: string, today: string, dose: string | undefined): StockHit {
  const values: Record<string, unknown> = { expiry, days_left: day(expiry) - day(today), qty, unit };
  if (dose !== undefined) { values.label_dose_per_str = dose; values.label_dose_el = comma(dose); }
  return { productId, category: 'stock_expiring', values };
}

export function stockHits(f: StockFacts, asOfUtc: string): StockHit[] {
  const today = athensDate(asOfUtc);
  const hits: StockHit[] = [];
  const usable = new Map<string, { sum: Decimal; unit: string }>();
  for (const lot of f.lots) {
    if (!lot.qty.known) continue;
    const q = lot.qty.value;
    if (validDate(lot.expiry) && day(lot.expiry) < day(today)) {
      hits.push({ productId: lot.productId, category: 'stock_expired', values: { expiry: lot.expiry, qty: q, unit: lot.unit, selectable: false, action: 'set_aside_return_authorised_scheme' } });
      continue; // an expired lot is not supply
    }
    if (validDate(lot.expiry) && day(lot.expiry) - day(today) <= f.expiringDays) {
      hits.push(expiringHit(lot.productId, lot.expiry, q, lot.unit, today, f.labelDose[lot.productId]));
    }
    const have = usable.get(lot.productId);
    usable.set(lot.productId, have && have.unit === lot.unit ? { sum: addDecimal(have.sum, q), unit: lot.unit } : { sum: q, unit: lot.unit });
  }
  for (const [productId, { sum, unit }] of usable) {
    const next = f.planned.find((p) => p.productId === productId && p.doseUnit === unit); // the next planned use, in the shelf's own unit
    if (!next || !next.areaStr.known || !next.dosePerStr.known || !f.lowFactor.known) continue;
    const need = mulDecimal(next.areaStr.value, next.dosePerStr.value);
    const threshold = mulDecimal(need, f.lowFactor.value);
    const enough = compareDecimal(sum, need) >= 0;
    if (!enough) hits.push({ productId, category: 'stock_insufficient', values: { qty: sum, next_use_qty: need, unit, sufficient_for_next_job: false } });
    else if (compareDecimal(sum, threshold) < 0) hits.push({ productId, category: 'stock_low', values: { qty: sum, next_use_qty: need, threshold_qty: threshold, unit, sufficient_for_next_job: true } });
  }
  return hits;
}
