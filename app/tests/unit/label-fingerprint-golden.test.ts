import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fingerprint } from '@aloni/rules-core';
import { readUse, statusOf } from '../../src/labels/label-use';

// The agronomist's approval covers EXACTLY the values of a label (the fingerprint). The phone computes it here; the SERVER computes and checks the same string in migration 0033 (private.label_fingerprint),
// so an approval can never sign a label with a fingerprint the phone would reject. Both sides are locked to ONE file of examples: this test fails if the phone's fingerprint drifts from the file,
// and supabase/tests/m14_approval.sql fails if the server's does. Regenerate with UPDATE_GOLDEN=1 only on purpose (it changes the approval contract).
const FILE = new URL('../../../supabase/tests/label-fingerprint.json', import.meta.url);
const P = 'aaaaaaaa-0000-0000-0000-00000000f001'; const C = 'cccccccc-0000-0000-0000-00000000f001';
const ROWS = [
  { product_id: P, crop_id: C, target: 'Περονόσπορος', dose_kind: 'single', dose_unit: 'ml/str', dose_min: '0.025', phi_days: '7', rei_hours: '24', max_apps: '3' },
  { product_id: P, crop_id: C, target: 'Αφίδες', dose_kind: 'range', dose_unit: 'g/100l', dose_min: '150', dose_max: '200', phi_days: '14', rei_hours: '48', max_apps: '2' },
  { product_id: P, crop_id: C, target: '', dose_kind: 'single', dose_unit: 'kg/str', dose_min: '1.50', phi_days: '0', rei_hours: '12', max_apps: '1' },            // a trailing zero survives; an empty target
  { product_id: P, crop_id: C, target: 'a "quoted" \\ back\\slash', dose_kind: 'single', dose_unit: 'l/str', dose_min: '0.5', phi_days: '21', rei_hours: '72', max_apps: '4' }, // characters JSON escapes
];
// rows the phone CANNOT read as signable values (an ambiguous decimal «1.500», a whole number of more than 4 digits): the server must refuse to sign them (0033), or the server gate would count a signature the phone rejects
const REFUSED = [
  { why: 'ambiguous decimal 1.500 (thousands or decimals?)', row: { ...ROWS[0]!, dose_min: '1.500' } },
  { why: 'ambiguous decimal in the upper dose of a range', row: { ...ROWS[1]!, dose_min: '1', dose_max: '2.000' } },
  { why: 'PHI of 5 digits', row: { ...ROWS[0]!, phi_days: '10000' } },
  { why: 'REI of 5 digits', row: { ...ROWS[0]!, rei_hours: '10000' } },
  { why: 'max applications of 5 digits', row: { ...ROWS[0]!, max_apps: '12345' } },
];
const vectors = () => ({ examples: ROWS.map((row) => ({ row, fingerprint: fingerprint(readUse(row)) })), refused: REFUSED });

describe('the label fingerprint is the same string on the phone and on the server', () => {
  it('matches the checked-in examples that the SQL test also uses', () => {
    if (process.env.UPDATE_GOLDEN === '1' || !existsSync(FILE)) writeFileSync(FILE, JSON.stringify(vectors(), null, 1) + '\n');
    expect(JSON.parse(readFileSync(FILE, 'utf8'))).toEqual(vectors());
  });
  it('the phone reads every «refused» row as blocked (some value unknown), and every example as complete', () => {
    for (const r of REFUSED) expect(statusOf(r.row), r.why).toBe('blocked');
    for (const row of ROWS) expect(statusOf(row)).not.toBe('blocked');
  });
});
