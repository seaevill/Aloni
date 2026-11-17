import { describe, expect, it } from 'vitest';
import { buildWorker } from '../../src/workers/worker';

describe('buildWorker', () => {
  it('a name and nothing else: no certificate, phone, photo or location field exists', () => {
    const r = buildWorker('  Γιώργος  ', 'farm', '2026-11-20T10:00:00Z', 'w1');
    expect(r).toEqual({ ok: true, row: { id: 'w1', farm_id: 'farm', name: 'Γιώργος', created_at: '2026-11-20T10:00:00Z', updated_at: '2026-11-20T10:00:00Z', deleted_at: null } });
  });
  it('a missing name is refused', () => {
    for (const bad of ['', '   ']) expect(buildWorker(bad, 'f', 'x', 'w')).toEqual({ ok: false });
  });
});
