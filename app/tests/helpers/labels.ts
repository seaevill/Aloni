import type { Row } from '../../src/db/schema';
import { buildLabelUse, withSignOff } from '../../src/labels/label-use';

/** A SIGNED label use (the only kind the gate counts) for one product and one crop, with the given waiting (days) and re-entry (hours) periods. */
export function signedLabelFor(productId: string, cropId: string, phi = '7', rei = '24', farm = 'f'): Row {
  const f = (text: string) => ({ notOnLabel: false, text });
  const r = buildLabelUse({ productId, cropId, target: '', source: '', kind: 'single', unit: 'ml/str', doseMin: f('0,025'), doseMax: f(''), phi: f(phi), rei: f(rei), maxApps: f('3') }, farm, '2026-11-01T00:00:00.000Z', `lu-${productId}-${cropId}`);
  if (!r.ok) throw new Error('setup');
  const s = withSignOff(r.row, 'Agronomist', '2026-11-01', '2026-11-01T00:00:00.000Z');
  if (!s) throw new Error('setup');
  return s;
}
