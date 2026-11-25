import { expect, it } from 'vitest';
import { printRegisterLines } from '../../src/export/register-pdf';

it('preserves the exact recorded dose and marks missing fields in the Greek draft', () => {
  const [line] = printRegisterLines({
    sprays: [{ id: 's', farm_id: 'f', sprayed_at: '2026-11-20T22:30:00Z', dose_str: '0.02500', dose_unit: 'l/str' }],
    links: [], plantings: [], parcels: [], crops: [], products: [], workers: [],
  });
  expect(line).toMatchObject({ dose: '0.02500', unit: 'l/str', parcel: 'άγνωστο', reg_no: 'άγνωστο', phi_until: 'άγνωστο' });
});

it('groups planting links under one spray without losing each recorded area', () => {
  const rows = printRegisterLines({
    sprays: [{ id: 's', farm_id: 'f', job_id: 'j', dose_str: '0.00200' }],
    links: [
      { id: 'a', farm_id: 'f', job_id: 'j', planting_id: 'p', area_str_treated: '2.30' },
      { id: 'b', farm_id: 'f', job_id: 'j', planting_id: 'q', area_str_treated: '0.40' },
    ],
    plantings: [
      { id: 'p', farm_id: 'f', parcel_id: 'x' }, { id: 'q', farm_id: 'f', parcel_id: 'y' },
    ],
    parcels: [{ id: 'x', farm_id: 'f', name: 'X' }, { id: 'y', farm_id: 'f', name: 'Y' }],
    crops: [], products: [], workers: [],
  });
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ dose: '0.00200', locations: [{ parcel: 'X', area: '2.30' }, { parcel: 'Y', area: '0.40' }] });
});
