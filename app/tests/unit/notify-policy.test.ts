import { describe, expect, it } from 'vitest';
import { DEFAULT_NOTIFY, inQuietHours, mayNotify, validTime } from '../../src/notify/policy';

const at = (hhmmAthens: string): Date => new Date(`2026-11-20T${hhmmAthens}:00+02:00`);   // winter: Athens = UTC+2
const on = { ...DEFAULT_NOTIFY, enabled: true };

describe('quiet hours 21:00–05:30 (Athens), crossing midnight', () => {
  it.each([['20:59', false], ['21:00', true], ['23:59', true], ['00:00', true], ['05:29', true], ['05:30', false], ['12:00', false]] as const)('%s → quiet=%s', (t, quiet) => { expect(inQuietHours(at(t), DEFAULT_NOTIFY)).toBe(quiet); });
  it('uses the Athens clock, not the phone\'s: 19:30 UTC in winter is 21:30 in Athens', () => { expect(inQuietHours(new Date('2026-11-20T19:30:00Z'), DEFAULT_NOTIFY)).toBe(true); });
  it('a window inside one day works; an unreadable setting is quiet (never send on a guess)', () => {
    expect(inQuietHours(at('13:00'), { quietFrom: '12:00', quietTo: '14:00' })).toBe(true);
    expect(inQuietHours(at('15:00'), { quietFrom: '12:00', quietTo: '14:00' })).toBe(false);
    expect(inQuietHours(at('12:00'), { quietFrom: '25:00', quietTo: '14:00' })).toBe(true);
  });
  it('validates «HH:MM»', () => { expect(validTime('21:00')).toBe(true); expect(validTime('24:00')).toBe(false); expect(validTime('9:00')).toBe(false); });
});

describe('the one gate for sending', () => {
  it('an UNSIGNED rule (info only) NEVER notifies, at any hour, even with notifications on', () => {
    for (const t of ['06:00', '12:00', '18:00']) expect(mayNotify('info_only', at(t), on)).toEqual({ send: false, why: 'unsigned_rule' });
  });
  it('a signed rule notifies only when switched on and outside the quiet hours', () => {
    expect(mayNotify('decide', at('12:00'), on)).toEqual({ send: true });
    expect(mayNotify('decide', at('12:00'), DEFAULT_NOTIFY)).toEqual({ send: false, why: 'off' });
    expect(mayNotify('decide', at('22:00'), on)).toEqual({ send: false, why: 'quiet_hours' });
  });
});
