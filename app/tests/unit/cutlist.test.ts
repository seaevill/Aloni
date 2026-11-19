import { describe, expect, it } from 'vitest';
import { cutToday } from '../../src/summary/cutlist';
import type { Row } from '../../src/db/schema';

// T8: one line per growing planting; a parcel with nothing growing says so and is not counted as «free».
const parcels: Row[] = [{ id: 'p1', farm_id: 'f', name: 'Κάτω Κάμπος' }, { id: 'p2', farm_id: 'f', name: 'Άδειο' }];
const plantings: Row[] = [
  { id: 'a', farm_id: 'f', parcel_id: 'p1', crop_id: 'spinach', status: 'growing' },
  { id: 'b', farm_id: 'f', parcel_id: 'p1', crop_id: 'rocket', status: 'growing' },
  { id: 'c', farm_id: 'f', parcel_id: 'p2', crop_id: 'rocket', status: 'finished' },
];
const name = (id: unknown): string => String(id);
const NOW = '2026-11-19T10:00:00Z';

describe('cutToday', () => {
  it('no sprays: both plantings are free, the empty parcel has no planting and is not counted free', () => {
    const r = cutToday(parcels, plantings, [], [], name, NOW);
    expect(r.lines.map((l) => [l.crop, l.state])).toEqual([['spinach', 'free'], ['rocket', 'free']]);
    expect(r.noPlanting.map((p) => p.id)).toEqual(['p2']);
    expect([r.freeParcels, r.heldParcels]).toEqual([1, 0]);
  });
  it('a spray with a missing waiting period holds ONLY the sprayed planting (unknown), the other stays free', () => {
    const links: Row[] = [{ id: 'l1', farm_id: 'f', job_id: 'j1', planting_id: 'a' }];
    const sprays: Row[] = [{ id: 's1', farm_id: 'f', job_id: 'j1', sprayed_at: '2026-11-18T08:00:00Z' }];
    const r = cutToday(parcels, plantings, links, sprays, name, NOW);
    expect(r.lines.find((l) => l.crop === 'spinach')?.state).not.toBe('free');
    expect(r.lines.find((l) => l.crop === 'rocket')?.state).toBe('free');
    expect([r.freeParcels, r.heldParcels]).toEqual([0, 1]);
  });
  it('a spray with a known waiting period shows the planting as «from» the end date; the other crop stays free', () => {
    const links: Row[] = [{ id: 'l1', farm_id: 'f', job_id: 'j1', planting_id: 'a' }];
    const sprays: Row[] = [{ id: 's1', farm_id: 'f', job_id: 'j1', sprayed_at: '2026-11-18T08:00:00Z', phi_days: '7', rei_hours: '24' }];
    const r = cutToday(parcels, plantings, links, sprays, name, NOW);
    const sp = r.lines.find((l) => l.crop === 'spinach');
    expect(sp?.state).toBe('from');
    expect(sp?.at.slice(0, 10)).toBe('2026-11-25');
    expect(r.lines.find((l) => l.crop === 'rocket')?.state).toBe('free');
  });
});
