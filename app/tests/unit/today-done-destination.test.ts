import { describe, expect, it } from 'vitest';
import { doneRecords } from '../../src/summary/today';
import type { Row } from '../../src/db/schema';

const today = '2026-11-28';
const planting: Row = { id: 'p1', farm_id: 'f', crop_id: 'c1', parcel_id: 'f1' };
const h = (id: string, extra: Record<string, unknown> = {}): Row => ({ farm_id: 'f', id, planting_id: 'p1', harvested_at: '2026-11-28T08:00:00Z', crates_str: '5', ...extra });
const run = (harvests: Row[], phone?: Record<string, { d: 'store' | 'dispatch' }>) =>
  doneRecords(today, [], harvests, [], [], [planting], () => '', () => '', phone);

describe('«Σήμερα έγιναν»: where the harvest went', () => {
  it('phone-only mode: the answer saved on this phone (settings) is used when the row carries none', () => {
    expect(run([h('h1')], { h1: { d: 'store' } })[0]!.destination).toBe('store');
    expect(run([h('h2')], { h2: { d: 'dispatch' } })[0]!.destination).toBe('dispatch');
  });
  it('the row\'s own server column wins over the phone\'s answer', () => {
    expect(run([h('h1', { destination: 'direct' })], { h1: { d: 'store' } })[0]!.destination).toBe('dispatch');
    expect(run([h('h1', { destination: 'store' })], { h1: { d: 'dispatch' } })[0]!.destination).toBe('store');
  });
  it('escape attempt: an answer for ANOTHER harvest is never used, and a truly unrecorded harvest stays unknown (never defaulted)', () => {
    expect(run([h('h1')], { other: { d: 'store' } })[0]!.destination).toBeUndefined();
    expect(run([h('h1')])[0]!.destination).toBeUndefined();
    expect(run([h('h1')], { h1: { d: 'bogus' as 'store' } })[0]!.destination).toBeUndefined();
  });
});
