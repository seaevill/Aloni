import { describe, expect, it } from 'vitest';
import { notices } from '../../src/summary/notices';

// E2 (no SQL): the bell is computed on the phone from the job rows it already has. Nothing is invented: «new job» for a worker = a planned job assigned to her that was created after she last looked;
// «done» for the owner = a job finished after he last looked. «Claimed» needs the job board (B3) and is not produced here.
const seen = '2026-11-21T08:00:00.000Z';
const job = (o: Record<string, unknown>) => ({ id: 'j', farm_id: 'f', kind: 'spray', status: 'planned', created_at: '2026-11-21T07:00:00.000Z', ...o });

describe('notices', () => {
  it('owner: a job finished after the last look is one notice, newest first', () => {
    const rows = [job({ id: 'a', status: 'done', done_at: '2026-11-21T09:00:00.000Z' }), job({ id: 'b', status: 'done', done_at: '2026-11-21T10:00:00.000Z' }), job({ id: 'c', status: 'done', done_at: '2026-11-21T07:30:00.000Z' })];
    const n = notices(rows, { role: 'owner', seenAt: seen });
    expect(n.map((x) => [x.kind, x.jobId])).toEqual([['done', 'b'], ['done', 'a']]);
  });
  it('worker: only planned jobs assigned to her and created after the last look; others and deleted ones are not listed', () => {
    const rows = [job({ id: 'mine', worker_id: 'w1', created_at: '2026-11-21T09:00:00.000Z' }), job({ id: 'other', worker_id: 'w2', created_at: '2026-11-21T09:00:00.000Z' }), job({ id: 'old', worker_id: 'w1' }), job({ id: 'gone', worker_id: 'w1', created_at: '2026-11-21T09:00:00.000Z', deleted_at: '2026-11-21T09:30:00.000Z' }), job({ id: 'fin', worker_id: 'w1', status: 'done', created_at: '2026-11-21T09:00:00.000Z' })];
    expect(notices(rows, { role: 'worker', workerId: 'w1', seenAt: seen }).map((x) => x.jobId)).toEqual(['mine']);
  });
  it('without a last-look time nothing is called new (first run: no flood of old jobs)', () => {
    expect(notices([job({ id: 'a', status: 'done', done_at: '2026-11-21T09:00:00.000Z' })], { role: 'owner', seenAt: undefined })).toEqual([]);
  });
  it('a worker without a roster link gets no notices; a done job without a time is not a notice', () => {
    expect(notices([job({ worker_id: 'w1', created_at: '2026-11-21T09:00:00.000Z' })], { role: 'worker', workerId: undefined, seenAt: seen })).toEqual([]);
    expect(notices([job({ id: 'a', status: 'done' })], { role: 'owner', seenAt: seen })).toEqual([]);
  });

  it('worker: an OPEN job nobody has (the board) created after the last look is new for every worker; a taken one is not', () => {
    const rows = [job({ id: 'open', created_at: '2026-11-21T09:00:00.000Z' }), job({ id: 'taken', worker_id: 'w2', created_at: '2026-11-21T09:00:00.000Z' }), job({ id: 'old-open', created_at: '2026-11-20T09:00:00.000Z' })];
    expect(notices(rows, { role: 'worker', workerId: 'w1', seenAt: seen }).map((x) => x.jobId)).toEqual(['open']);
  });

  it('owner: a job that was open when he last looked and has a worker now was TAKEN; one that was never seen open is not', () => {
    const rows = [job({ id: 'was-open', worker_id: 'w2', created_at: '2026-11-20T09:00:00.000Z', updated_at: '2026-11-21T09:00:00.000Z' }), job({ id: 'always-assigned', worker_id: 'w2', created_at: '2026-11-20T09:00:00.000Z', updated_at: '2026-11-21T09:00:00.000Z' }), job({ id: 'still-open', created_at: '2026-11-20T09:00:00.000Z' })];
    const n = notices(rows, { role: 'owner', seenAt: seen }, new Set(['was-open', 'still-open']));
    expect(n.map((x) => [x.kind, x.jobId])).toEqual([['claimed', 'was-open']]);
  });
});
