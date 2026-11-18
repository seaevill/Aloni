import { afterEach, describe, expect, it } from 'vitest';
import { athensInstant, athensLocalNow } from '../../src/spray/time';

// Spray and harvest times are read as EUROPE/ATHENS wall-clock time, whatever the phone's own time zone (Bora's workers may carry a phone set to Istanbul).
const ZONE = process.env.TZ;
afterEach(() => { if (ZONE === undefined) delete process.env.TZ; else process.env.TZ = ZONE; });

describe.each(['UTC', 'Europe/Istanbul', 'America/New_York', 'Europe/Athens'])('phone time zone %s', (zone) => {
  it('winter and summer wall-clock times become the same UTC second', () => {
    process.env.TZ = zone;
    expect(athensInstant('2026-11-20T10:00')).toBe('2026-11-20T08:00:00Z'); // EET, +02:00
    expect(athensInstant('2026-07-01T10:00')).toBe('2026-07-01T07:00:00Z'); // EEST, +03:00
  });
  it('the clock change in spring: a time that does not exist is refused, the ones around it are exact', () => {
    process.env.TZ = zone;
    expect(athensInstant('2026-03-29T02:59')).toBe('2026-03-29T00:59:00Z');
    expect(athensInstant('2026-03-29T03:00')).toBeUndefined();
    expect(athensInstant('2026-03-29T03:30')).toBeUndefined();
    expect(athensInstant('2026-03-29T04:00')).toBe('2026-03-29T01:00:00Z');
  });
  it('the clock change in autumn: an ambiguous hour takes the LATER instant (a later end can only lengthen a waiting period)', () => {
    process.env.TZ = zone;
    expect(athensInstant('2026-10-25T02:59')).toBe('2026-10-24T23:59:00Z');
    expect(athensInstant('2026-10-25T03:30')).toBe('2026-10-25T01:30:00Z'); // not 00:30Z
    expect(athensInstant('2026-10-25T04:00')).toBe('2026-10-25T02:00:00Z');
  });
  it('the form starts at the Athens clock, not the phone clock', () => {
    process.env.TZ = zone;
    expect(athensLocalNow(new Date('2026-11-20T08:00:00Z'))).toBe('2026-11-20T10:00');
    expect(athensLocalNow(new Date('2026-07-01T07:00:00Z'))).toBe('2026-07-01T10:00');
    expect(athensLocalNow(new Date('2026-12-31T22:30:00Z'))).toBe('2027-01-01T00:30'); // across midnight and the new year
  });
  it('unreadable text is never a time', () => {
    process.env.TZ = zone;
    for (const bad of ['', 'Invalid Date', 'NaN', '2026-02-31T10:00', '2026-11-20T25:00', '2026-11-20', '2026-11-20T10:00:00', '20/11/2026 10:00']) expect(athensInstant(bad), bad).toBeUndefined();
    expect(athensLocalNow(new Date('Invalid Date'))).toBeUndefined();
  });
});
