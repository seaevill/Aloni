import { describe, expect, it } from 'vitest';
import type { Row } from '../../src/db/schema';
import { runningSince, waitRing } from '../../src/summary/wait';
import { signedLabelFor } from '../helpers/labels';

// The waiting ring: days left ROUND UP and percent elapsed ROUND DOWN (whole numbers by integer arithmetic): the app never shows a waiting period shorter or further along than it is.
describe('waitRing', () => {
  const since = '2026-11-10T08:00:00Z'; const until = '2026-11-17T08:00:00Z';   // 7 days
  it('exactly on a day boundary: days left is that whole number; percent is exact', () => {
    expect(waitRing(since, until, '2026-11-14T08:00:00Z')).toEqual({ daysLeft: 3, percent: 57 });   // 4 of 7 days = 57.1 % → 57 (down)
    expect(waitRing(since, until, '2026-11-10T08:00:00Z')).toEqual({ daysLeft: 7, percent: 0 });
  });
  it('part of a day left counts as a whole day (up); percent never rounds up', () => {
    expect(waitRing(since, until, '2026-11-16T20:00:00Z')).toEqual({ daysLeft: 1, percent: 92 });   // 12 h left of 7 days: elapsed 6.5/7 = 92.86 % → 92 (down), days left 0.5 → 1 (up)
  });
  it('over (now at or after the end), an end before the start, or an unreadable time: no ring (the screen shows «Κοπή από …» or the reason)', () => {
    expect(waitRing(since, until, until)).toBeUndefined();
    expect(waitRing(since, until, '2026-11-20T08:00:00Z')).toBeUndefined();
    expect(waitRing(until, since, '2026-11-12T08:00:00Z')).toBeUndefined();
    expect(waitRing('bad', until, since)).toBeUndefined();
    expect(waitRing(since, 'bad', since)).toBeUndefined();
  });
  it('a spraying in the future of now (clock skew) shows 0 %, never a negative', () => {
    expect(waitRing(since, until, '2026-11-09T08:00:00Z')).toEqual({ daysLeft: 8, percent: 0 });
  });
});

describe('runningSince', () => {
  const pls: Row[] = [{ id: 'x1', farm_id: 'f', parcel_id: 'P', crop_id: 'cx' } as unknown as Row];
  const link = (job: string): Row => ({ id: `l-${job}`, farm_id: 'f', job_id: job, planting_id: 'x1' } as unknown as Row);
  const spray = (id: string, job: string, at: string): Row => ({ id, farm_id: 'f', job_id: job, product_id: 'pq', sprayed_at: at, phi_days: '7', rei_hours: '24', label_state: 'signed', phi_source: 'label' } as unknown as Row);
  const labels = [signedLabelFor('pq', 'cx', '7', '24')];
  it('the spraying that sets the end of the wait: with two sprayings the one whose period ends last', () => {
    const sprays = [spray('s1', 'j1', '2026-11-05T08:00:00Z'), spray('s2', 'j2', '2026-11-10T08:00:00Z')];
    expect(runningSince('x1', '2026-11-12T08:00:00Z', [link('j1'), link('j2')], sprays, pls, labels)).toBe('2026-11-10T08:00:00Z');
  });
  it('nothing running (free, never sprayed, or unknown): undefined', () => {
    expect(runningSince('x1', '2026-11-30T08:00:00Z', [link('j1')], [spray('s1', 'j1', '2026-11-10T08:00:00Z')], pls, labels)).toBeUndefined();
    expect(runningSince('x1', '2026-11-12T08:00:00Z', [], [], pls, labels)).toBeUndefined();
    expect(runningSince('x1', '2026-11-12T08:00:00Z', [link('j1')], [spray('s1', 'j1', '2026-11-10T08:00:00Z')], pls, [])).toBeUndefined();
  });
});
