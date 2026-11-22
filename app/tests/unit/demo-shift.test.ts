import { describe, expect, it } from 'vitest';
import { shiftDemoDates } from '../../src/db/demo-weather';

describe('shiftDemoDates: the Demo moves as a whole so the prototype\'s «today» is the real today', () => {
  const data = { meta: { today: '2026-11-16' }, jobs: [{ id: 'J1', date: '2026-11-15', notes: 'x' }, { id: 'J2', date: 'not a date' }], plantings: [{ id: 'P', sown: '2026-10-01', harvest_from: '2026-11-20', harvest_to: '2026-12-01', area: 1 }], parcels: [{ id: 'A', soil: { date: '2026-09-02' } }] };
  it('moves job days and planting dates by the same number of days; everything else stays', () => {
    const s = shiftDemoDates(data, '2026-11-16', '2026-11-22');
    expect(s.jobs[0]).toEqual({ id: 'J1', date: '2026-11-21', notes: 'x' });
    expect(s.jobs[1]).toEqual({ id: 'J2', date: 'not a date' });
    expect(s.plantings[0]).toEqual({ id: 'P', sown: '2026-10-07', harvest_from: '2026-11-26', harvest_to: '2026-12-07', area: 1 });
    expect(s.parcels[0]!.soil.date).toBe('2026-09-02');
  });
  it('does nothing when the days are equal or unreadable (nothing guessed)', () => {
    expect(shiftDemoDates(data, '2026-11-16', '2026-11-16')).toEqual(data);
    expect(shiftDemoDates(data, '', '2026-11-22')).toEqual(data);
  });
});
