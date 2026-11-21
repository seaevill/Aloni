import { describe, expect, it } from 'vitest';
import type { Row } from '../../src/db/schema';
import { buildObservation } from '../../src/worker/jobs';
import { jobParcelPicks, pendingObservations } from '../../src/summary/observations';

const worker = { id: 'w1', name: 'Γιώργος' } as unknown as Row;
const obs = (id: string, at: string, extra: Record<string, unknown> = {}) => ({ id, parcel_id: 'p1', kind: 'pest', observed_at: at, ...extra }) as unknown as Row;

describe('worker observation → owner review', () => {
  it('a photo is part of the observation only when one was taken; the worker never writes a diagnosis', () => {
    const plain = buildObservation('p1', 'pest', 'φύλλα', worker, 'f1', '2026-11-21T08:00:00Z', 'o1');
    expect(plain).toBeDefined();
    expect(plain && 'photo' in plain).toBe(false);
    const withPhoto = buildObservation('p1', 'pest', '', worker, 'f1', '2026-11-21T08:00:00Z', 'o2', 'media-1');
    expect(withPhoto).toMatchObject({ photo: 'media-1', actor_id: 'w1' });
    expect(buildObservation('', 'pest', '', worker, 'f1', 'x', 'o3')).toBeUndefined();
  });

  it('«Για έλεγχο» lists observations nobody has looked at yet, newest first, at most 20; seen and deleted ones are gone', () => {
    const rows = [obs('a', '2026-11-20T08:00:00Z'), obs('b', '2026-11-21T08:00:00Z'), obs('c', '2026-11-19T08:00:00Z', { deleted_at: '2026-11-20T00:00:00Z' }), obs('d', '2026-11-18T08:00:00Z')];
    expect(pendingObservations(rows, ['d']).map((r) => r.id)).toEqual(['b', 'a']);
    expect(pendingObservations(rows, [])).toHaveLength(3);
    const many = Array.from({ length: 30 }, (_, i) => obs(`m${i}`, `2026-11-${String(i % 28 + 1).padStart(2, '0')}T08:00:00Z`));
    expect(pendingObservations(many, [])).toHaveLength(20);
  });

  it('«Νέα εργασία» preselects only the plantings of that parcel (no product, dose or worker is ever chosen for the owner)', () => {
    const plantings = [{ id: 'pl1', parcel_id: 'p1' }, { id: 'pl2', parcel_id: 'p2' }, { id: 'pl3', parcel_id: 'p1', deleted_at: 'x' }, { id: 'pl4', parcel_id: 'p1' }] as unknown as Row[];
    expect(jobParcelPicks(plantings, 'p1')).toEqual(['pl1', 'pl4']);
    expect(jobParcelPicks(plantings, 'nope')).toEqual([]);
  });
});
