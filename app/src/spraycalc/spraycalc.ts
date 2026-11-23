import { mulDecimal, parseDecimal, type Decimal } from '@aloni/rules-core';
import { signedUseOf } from '../labels/label-use';
import type { Row } from '../db/schema';

// «Υπολογισμός ψεκαστικού»: what the label dose comes to for an area. It multiplies the dose of a SIGNED label by the area, exactly (decimal arithmetic, nothing rounded, nothing converted); the label's own
// unit is kept. A label that is not signed, changed since it was signed, or incomplete gives NO number. A per-100-litres dose needs the water the grower uses (litres per στρέμμα), which he types. The
// number of tanks = water ÷ tank volume, counted up; it needs both numbers the grower typed. The app chooses no product, no dose and no water rate. Information only.
export type Amount = { known: true; amount: string; unit: 'ml' | 'g' | 'l' | 'kg' } | { known: false; reason: 'no-water' };
export interface DoseLine { which: 'single' | 'min' | 'max'; product: Amount }
export type SprayCalc =
  | { ok: false; reason: 'unsigned' | 'no-area' }
  | { ok: true; doses: DoseLine[]; water: { known: true; litres: string } | { known: false }; tanks: { known: true; count: string } | { known: false } };

const positive = (s: string | undefined): Decimal | undefined => {
  if (s === undefined) return undefined;
  const d = parseDecimal(s);
  return d.known && /[1-9]/.test(d.value) ? d.value : undefined;
};
/** A decimal as an integer and a power of ten: «1.25» → 125n, scale 2. */
const split = (d: Decimal): { n: bigint; scale: number } => { const [i = '', f = ''] = d.split('.'); return { n: BigInt(`${i}${f}`), scale: f.length }; };
/** The least whole number of tanks that holds the water: ceil(water / tank), in exact integer arithmetic. */
function tankCount(water: Decimal, tank: Decimal): string {
  const w = split(water); const k = split(tank);
  const num = w.n * 10n ** BigInt(Math.max(0, k.scale - w.scale)); const den = k.n * 10n ** BigInt(Math.max(0, w.scale - k.scale));
  return ((num + den - 1n) / den).toString();
}
const UNIT_OF = { 'ml/str': 'ml', 'g/str': 'g', 'l/str': 'l', 'kg/str': 'kg', 'ml/100l': 'ml', 'g/100l': 'g' } as const;

export function sprayCalc(labelRow: Row, areaStr: string, tankL: string | undefined, waterLPerStr: string | undefined): SprayCalc {
  const signed = signedUseOf(labelRow);
  if (!signed.known) return { ok: false, reason: 'unsigned' };
  const area = positive(areaStr);
  if (area === undefined) return { ok: false, reason: 'no-area' };
  const dose = signed.value.dose; const unit = UNIT_OF[dose.unit];
  const rate = positive(waterLPerStr);
  const waterL = rate === undefined ? undefined : mulDecimal(rate, area);
  const amount = (d: Decimal): Amount => {
    if (dose.unit === 'ml/100l' || dose.unit === 'g/100l') return waterL === undefined ? { known: false, reason: 'no-water' } : { known: true, amount: mulDecimal(d, mulDecimal(waterL, '0.01' as Decimal)), unit };
    return { known: true, amount: mulDecimal(d, area), unit };
  };
  const doses: DoseLine[] = dose.kind === 'single' ? [{ which: 'single', product: amount(dose.min) }] : [{ which: 'min', product: amount(dose.min) }, { which: 'max', product: amount(dose.max) }];
  const tank = positive(tankL);
  return {
    ok: true, doses,
    water: waterL === undefined ? { known: false } : { known: true, litres: waterL },
    tanks: waterL === undefined || tank === undefined ? { known: false } : { known: true, count: tankCount(waterL, tank) },
  };
}
