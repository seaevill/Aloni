import { describe, expect, it } from 'vitest';
import { crateLabel } from '../../src/summary/crate-label';
import { encodeQr } from '../../src/auth/qr';

const row = (over: Record<string, unknown> = {}) => ({ id: '3f2a9c1e-7b44-4d0a-8c11-aa00bb22cc33', farm_id: 'f', planting_id: 'pl1', harvested_at: '2026-11-22T22:30:00.000Z', crates_str: '7', ...over });

describe('crate label: crop, harvest day, lot and crates; no person, no advice', () => {
  it('the lot code is the first 8 characters of the harvest record id, upper case; the day is the Athens calendar day', () => {
    const l = crateLabel(row(), 'spinach');
    expect(l.lot).toBe('3F2A9C1E');
    expect(l.day).toBe('2026-11-23');                              // 22:30 UTC is already the next day in Athens
    expect(l.crates).toBe('7');
  });
  it('the code text is plain ASCII, readable by any phone camera, and fits the encoder', () => {
    const l = crateLabel(row(), 'spinach');
    expect(l.qrText).toBe('ALONI/LOT/3F2A9C1E/spinach/2026-11-23/7');
    expect(/^[\x20-\x7e]+$/.test(l.qrText)).toBe(true);
    expect(() => encodeQr(l.qrText)).not.toThrow();
  });
  it('unreadable crates are left out of the code and reported as unknown, never as 0', () => {
    const l = crateLabel(row({ crates_str: 'x' }), 'spinach');
    expect(l.crates).toBeUndefined();
    expect(l.qrText).toBe('ALONI/LOT/3F2A9C1E/spinach/2026-11-23');
  });
  it('a crop slug that is not plain lower-case letters and digits is left out rather than put in the code', () => {
    expect(crateLabel(row(), 'ρόκα').qrText).toBe('ALONI/LOT/3F2A9C1E/2026-11-23/7');
  });
});
