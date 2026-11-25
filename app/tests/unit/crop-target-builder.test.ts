import { describe, expect, it } from 'vitest';
import { buildCropTarget } from '../../src/owner-records/records';
import { serverTargetsOf } from '../../src/owner-records/mode';

const F = '11111111-1111-4111-8111-111111111111';
const NOW = '2026-11-25T10:00:00.000Z';
describe('season target rows (SQL 0041)', () => {
  it('a whole number of crates above 0 and a real day make an integer row; nothing else is accepted', () => {
    const r = buildCropTarget({ cropId: 'c', crates: ' 120 ', since: '2026-11-01' }, F, NOW, 'id1');
    expect(r.ok && r.row.target_crates).toBe(120);
    for (const crates of ['0', '-3', '1.5', '1,5', 'abc', '', '1000001']) expect(buildCropTarget({ cropId: 'c', crates, since: '2026-11-01' }, F, NOW, 'x')).toEqual({ ok: false, reason: 'crates' });
    for (const since of ['', '2026-02-30', 'tomorrow']) expect(buildCropTarget({ cropId: 'c', crates: '5', since }, F, NOW, 'x')).toEqual({ ok: false, reason: 'since' });
    expect(buildCropTarget({ cropId: '', crates: '5', since: '2026-11-01' }, F, NOW, 'x')).toEqual({ ok: false, reason: 'reference' });
  });
  it('server mode only from a confirmed migration ≥ 0041', () => {
    expect([undefined, { migration: '0037' }, { migration: '0040' }, { migration: '0041' }, { migration: '0042' }].map((c) => serverTargetsOf(c as never))).toEqual([false, false, false, true, true]);
  });
});
