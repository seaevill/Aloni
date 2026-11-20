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
    expect(lines[1]).toMatchObject({ holder_name: 'Bora Farm', holder_vat_id: '123456789', record_id: 's1', application_end: '2026-11-20T10:00:00+02:00', application_start: '', parcel_name: 'Κάτω Κάμπος', crop_slug: 'spinach', eppo_code: 'SPQOL', treated_area_stremma: '0.25', treated_area_ha: '0.025', product_trade_name: 'Kocide, 2000', authorisation_number: '123/45', dose_as_entered: '0.025', dose_unit_as_entered: 'ml/str', dose_per_ha: '0.00025', dose_per_ha_unit: 'L/ha' });
    const csv = toMachineCsv(MACHINE_COLUMNS, lines.map((l) => MACHINE_COLUMNS.map((c) => l[c])));
    const rows = csv.trimEnd().split('\r\n');
    expect(rows[0]).toBe(MACHINE_COLUMNS.join(','));
    expect(rows[2]).toContain('"Kocide, 2000"');                 // a comma inside a value is quoted (RFC 4180)
    expect(csv.charCodeAt(0)).not.toBe(0xfeff);                  // no BOM
  });

  it('exports the recorded start, IACS parcel, BBCH and exact treated area for each linked field', () => {
    const complete = {
      ...data,
      sprays: [{ ...data.sprays[0], started_at: '2026-11-20T07:45:00Z', bbch: '09', flags: [] }],
      links: [...data.links, { ...data.links[0], id: 'l2', planting_id: 'pl2', area_str_treated: '0.125' }],
      plantings: [...data.plantings, { ...data.plantings[0], id: 'pl2', parcel_id: 'pa2' }],
      parcels: [
        { ...data.parcels[0], opekepe_code: '001' },
        { ...data.parcels[0], id: 'pa2', name: 'Second test field', opekepe_code: '002' },
      ],
    };
    const lines = machineLines(complete, { name: 'Test farm', vatId: '' });
    expect(lines.map((line) => ({
      product: line.product_trade_name, authorisation: line.authorisation_number,
      start: line.application_start, dose: line.dose_per_ha, unit: line.dose_per_ha_unit,
      parcel: line.iacs_parcel_id, area: line.treated_area_ha, eppo: line.eppo_code, bbch: line.bbch_stage,
    }))).toEqual([
      { product: 'Kocide, 2000', authorisation: '123/45', start: '2026-11-20T09:45:00+02:00', dose: '0.00025', unit: 'L/ha', parcel: '001', area: '0.025', eppo: 'SPQOL', bbch: '09' },
      { product: 'Kocide, 2000', authorisation: '123/45', start: '2026-11-20T09:45:00+02:00', dose: '0.00025', unit: 'L/ha', parcel: '002', area: '0.0125', eppo: 'SPQOL', bbch: '09' },
    ]);
    expect(warningLines(complete)).toEqual([]);
  });

  it('warnings are a separate list of codes, one per record and flag; a spray without warnings has none', () => {
    const w = warningLines(data).filter((x) => x.record_id === 's1').map((x) => x.warning_code);
    expect(w.slice(0, 2)).toEqual(['late_entry', 'max_apps_exceeded']);                       // the app's own flags first
    expect(w).toContain('missing_start_time');                                                 // «fill in»: the start time and the BBCH stage are not held yet
    expect(w).toContain('missing_bbch_stage'); expect(w).toContain('missing_iacs_parcel_id');
    expect(w).not.toContain('missing_eppo_code'); expect(w).not.toContain('missing_authorisation_number'); // spinach has a code, the product a number
  });
});
