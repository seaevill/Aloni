import { describe, expect, it } from 'vitest';
import { hoursFor, volumeFor, weekWater } from '../../src/summary/water';
import type { Day } from '../../src/weather/strip';

const days = (rain: Array<number | undefined>, et0: Array<number | undefined>): Day[] => rain.map((r, i) => ({ date: `2026-11-${String(17 + i).padStart(2, '0')}`, rain: r, et0: et0[i] }));
const week = (rain: number[], et0: number[]) => days(rain, et0);

describe('weekly water: what the plants lost (ET0 × Kc) minus the rain, information only', () => {
  it('needs ET0 of all 7 days, a Kc and the rain of all 7 days; then need − rain', () => {
    const w = weekWater(week([0, 0, 2, 0, 4, 0, 0], [2, 2, 2, 2, 2, 2, 2]), '2026-11-23', '1');
    expect(w).toEqual({ rain: { known: true, mm: 6 }, need: { known: true, mm: 14 }, gap: { known: true, mm: 8 } });
  });
  it('the rain is known without ET0; the need and the gap say WHY they are unknown', () => {
    const w = weekWater(week([0, 0, 2, 0, 4, 0, 0], [2, 2, 2, 2, 2, 2, 2]).map((d) => ({ ...d, et0: undefined })), '2026-11-23', '1');
    expect(w.rain).toEqual({ known: true, mm: 6 });
    expect(w.need).toEqual({ known: false, reason: 'no-et0' });
    expect(w.gap).toEqual({ known: false, reason: 'no-et0' });
  });
  it('no Kc = the need is unknown (a Kc is never assumed)', () => {
    const w = weekWater(week([0, 0, 0, 0, 0, 0, 0], [2, 2, 2, 2, 2, 2, 2]), '2026-11-23', undefined);
    expect(w.need).toEqual({ known: false, reason: 'no-kc' });
    expect(w.rain).toEqual({ known: true, mm: 0 });
  });
  it('a day without rain data makes the rain (and the gap) unknown, never a zero', () => {
    const w = weekWater(days([0, 0, undefined, 0, 4, 0, 0], [2, 2, 2, 2, 2, 2, 2]), '2026-11-23', '1');
    expect(w.rain).toEqual({ known: false, reason: 'no-rain' });
    expect(w.gap.known).toBe(false);
  });
  it('a bad Kc is unknown, not zero', () => {
    expect(weekWater(week([0, 0, 0, 0, 0, 0, 0], [2, 2, 2, 2, 2, 2, 2]), '2026-11-23', 'abc').need).toEqual({ known: false, reason: 'no-kc' });
  });
});


describe('water volume: the need (mm) × the area (στρέμμα) = m³, exactly (1 mm over 1 στρέμμα = 1 m³)', () => {
  it('multiplies a known need by the planting area; the area is the sum of the plantings, typed with a comma or a point', () => {
    expect(volumeFor({ known: true, mm: 14 }, ['0,5', '1'])).toEqual({ known: true, m3: 21 });
    expect(volumeFor({ known: true, mm: 10 }, ['0.25'])).toEqual({ known: true, m3: 2.5 });
  });
  it('an unknown need keeps its reason; an area that is missing or unreadable is unknown, never 0', () => {
    expect(volumeFor({ known: false, reason: 'no-et0' }, ['1'])).toEqual({ known: false, reason: 'no-et0' });
    expect(volumeFor({ known: true, mm: 14 }, [])).toEqual({ known: false, reason: 'no-area' });
    expect(volumeFor({ known: true, mm: 14 }, ['1', 'abc'])).toEqual({ known: false, reason: 'no-area' });
  });
  it('hours = m³ ÷ the flow the owner typed (m³ per hour); no flow or a bad flow = unknown', () => {
    expect(hoursFor(21, '3')).toEqual({ known: true, hours: 7 });
    expect(hoursFor(21, '3,5')).toEqual({ known: true, hours: 6 });
    expect(hoursFor(21, undefined)).toEqual({ known: false });
    expect(hoursFor(21, '0')).toEqual({ known: false });
    expect(hoursFor(21, 'abc')).toEqual({ known: false });
  });
});
