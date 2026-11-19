import { describe, expect, it } from 'vitest';
import type { Row } from '../../src/db/schema';
import { athensIso, MACHINE_COLUMNS, machineLines, toMachineCsv, warningLines } from '../../src/export/machine';

const F = 'f';
const data = {
  sprays: [
    { id: 's1', farm_id: F, job_id: 'j1', product_id: 'pr1', applicator_id: 'w1', sprayed_at: '2026-11-20T08:00:00Z', dose_str: '0.025', dose_unit: 'ml/str', qty_str: '0.250', label_state: 'signed', phi_until: '2026-11-27T08:00:00Z', rei_until: '2026-11-21T08:00:00Z', flags: ['late_entry', 'max_apps_exceeded'] },
    { id: 's2', farm_id: F, job_id: 'j2', product_id: 'pr1', applicator_id: 'w1', sprayed_at: '2026-07-20T08:00:00Z', dose_str: '0.5', dose_unit: 'g/str', label_state: 'unsigned' },
  ] as Row[],
  links: [{ id: 'l1', farm_id: F, job_id: 'j1', planting_id: 'pl1', area_str_treated: '0.25' }] as Row[],
  plantings: [{ id: 'pl1', farm_id: F, parcel_id: 'pa1', crop_id: 'c1' }] as Row[], parcels: [{ id: 'pa1', farm_id: F, name: 'Κάτω Κάμπος' }] as Row[],
  crops: [{ id: 'c1', farm_id: F, slug: 'spinach' }] as Row[], products: [{ id: 'pr1', farm_id: F, name: 'Kocide, 2000', reg_no: '123/45' }] as Row[], workers: [{ id: 'w1', farm_id: F, name: 'Γιώργος' }] as Row[],
};

describe('the machine-readable register', () => {
  it('times are ISO 8601 with the Athens offset in winter (+02:00) and summer (+03:00)', () => {
    expect(athensIso('2026-11-20T08:00:00Z')).toBe('2026-11-20T10:00:00+02:00');
    expect(athensIso('2026-07-20T08:00:00Z')).toBe('2026-07-20T11:00:00+03:00');
    expect(athensIso('2026-11-20T22:30:00Z')).toBe('2026-11-21T00:30:00+02:00');
    expect(athensIso('not a time')).toBe('');
  });

  it('fixed English field names, a decimal POINT and the stored text exactly (0.250 stays 0.250); the holder is on every line', () => {
    const lines = machineLines(data, { name: 'Bora Farm', vatId: '123456789' });
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatchObject({ holder_name: 'Bora Farm', holder_vat_id: '123456789', record_id: 's1', applied_end: '2026-11-20T10:00:00+02:00', parcel: 'Κάτω Κάμπος', crop: 'spinach', treated_area_str: '0.25', product: 'Kocide, 2000', registration_number: '123/45', dose: '0.025', dose_unit: 'ml/str', quantity_used: '0.250', label_state: 'signed', phi_until: '2026-11-27T10:00:00+02:00', rei_until: '2026-11-21T10:00:00+02:00' });
    const csv = toMachineCsv(MACHINE_COLUMNS, lines.map((l) => MACHINE_COLUMNS.map((c) => l[c])));
    const rows = csv.trimEnd().split('\r\n');
    expect(rows[0]).toBe(MACHINE_COLUMNS.join(','));
    expect(rows[2]).toContain('"Kocide, 2000"');                 // a comma inside a value is quoted (RFC 4180)
    expect(csv.charCodeAt(0)).not.toBe(0xfeff);                  // no BOM
  });

  it('warnings are a separate list of codes, one per record and flag; a spray without warnings has none', () => {
    expect(warningLines(data)).toEqual([{ record_id: 's1', warning_code: 'late_entry' }, { record_id: 's1', warning_code: 'max_apps_exceeded' }]);
  });
});
