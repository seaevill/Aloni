import { describe, expect, it } from 'vitest';
import { parseInstant, parsePhiDays, phiEnd } from '@aloni/rules-core';
describe('PROBE pulled timestamps', () => {
  it('D13 a server timestamptz (to_jsonb → +00:00, microseconds) is not an instant for the rules', () => {
    const forms = ['2026-11-20T08:00:00Z', '2026-11-20T08:00:00+00:00', '2026-11-20T08:00:00.123456+00:00', '2026-11-20T08:00:00.000Z'];
    const out = forms.map((f) => [f, parseInstant(f).known, phiEnd(f, parsePhiDays('7')).known]);
    console.log('D13', JSON.stringify(out));
    expect(out.every(([, a]) => a)).toBe(true);
  });
});
