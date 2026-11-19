import { describe, expect, it } from 'vitest';
import { DEFAULT_NOTIFY } from '../../src/notify/policy';
import { isSigned, noticeOf, RULE_IDS } from '../../src/notify/rules';

const noon = new Date('2026-11-20T10:00:00Z');   // 12:00 in Athens
const on = { ...DEFAULT_NOTIFY, enabled: true };
describe('which rules may notify', () => {
  it('with no sign-off at all, NO rule ever notifies (16 rules), even switched on at noon', () => {
    expect(RULE_IDS).toHaveLength(16);
    for (const id of RULE_IDS) expect(noticeOf(undefined, id, noon, on)).toBe('unsigned');
  });
  it('a sign-off needs a name and a real date; only that rule can notify, and not in the quiet hours or when switched off', () => {
    const so = { frost: { by: 'Agronomist', on: '2026-11-01' }, phi: { by: '', on: '2026-11-01' }, rei: { by: 'A', on: 'yesterday' } };
    expect(isSigned(so, 'frost')).toBe(true); expect(isSigned(so, 'phi')).toBe(false); expect(isSigned(so, 'rei')).toBe(false);
    expect(noticeOf(so, 'frost', noon, on)).toBe('allowed');
    expect(noticeOf(so, 'frost', new Date('2026-11-20T21:00:00Z'), on)).toBe('quiet');     // 23:00 Athens
    expect(noticeOf(so, 'frost', noon, DEFAULT_NOTIFY)).toBe('off');
    expect(noticeOf(so, 'phi', noon, on)).toBe('unsigned'); expect(noticeOf(so, 'phi', noon, DEFAULT_NOTIFY)).toBe('unsigned');
  });
});
