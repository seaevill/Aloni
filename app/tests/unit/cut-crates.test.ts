import { describe, expect, it } from 'vitest';
import { cutCrates } from '../../src/summary/today';
import type { Row } from '../../src/db/schema';

const h = (crates: string, at: string): Row => ({ id: crates + at, farm_id: 'f', crates_str: crates, harvested_at: at });
const NOW = '2026-11-20T10:00:00.000Z';
describe('crates cut in the last 7 / 28 days', () => {
  const rows = [h('12', '2026-11-19T07:00:00Z'), h('5', '2026-11-14T10:00:01Z'), h('8', '2026-11-10T07:00:00Z'), h('40', '2026-10-01T07:00:00Z'), h('x', '2026-11-19T07:00:00Z'), h('3', 'soon'), h('9', '2026-11-21T07:00:00Z')];
  it('counts whole crates inside the window only; an unreadable count or time and a time in the future count for nothing', () => {
    expect(cutCrates(rows, NOW, 7)).toBe(17);
    expect(cutCrates(rows, NOW, 28)).toBe(25);
    expect(cutCrates([], NOW, 7)).toBe(0);
  });
});
