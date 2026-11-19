import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { pendingOps } from '../../src/repo';
import { push, type Transport } from '../../src/sync/engine';
import { completionArgs, queueCompletion } from '../../src/worker/remote';
import { TEST_FARM_ID as F, newDb } from '../helpers/factories';

describe('the worker\'s «Έγινε» on a real farm is a queued call to the server', () => {
  it('sends only what the worker supplies (job, end time, note, late reason); an empty note is null, not a default', () => {
    expect(completionArgs('j1', '2026-11-20T08:00:00Z', '2026-11-20T07:30:00Z', '  a little more  ', '')).toEqual({ p_job: 'j1', p_ended_at: '2026-11-20T08:00:00Z', p_started_at: '2026-11-20T07:30:00Z', p_note: 'a little more', p_late_reason: null });
    expect(Object.keys(completionArgs('j1', 't', 's', '', ''))).toEqual(['p_job', 'p_ended_at', 'p_started_at', 'p_note', 'p_late_reason']); // no product, no dose, no label: they are fixed on the server
  });

  it('is queued like a record (counted, survives a missing signal) and leaves the queue once the server has answered it', async () => {
    const db = await newDb();
    await queueCompletion(db, F, 'j1', '2026-11-20T08:00:00Z', '2026-11-20T07:30:00Z', '', '');
    expect(pendingOps.value).toBe(1);
    const seen: Array<[string, Record<string, unknown>]> = [];
    const tr: Transport = { applyOps: async () => [], pull: async () => ({ rows: [], more: false, reset: false, cursor: null }), rpc: async (n, a) => { seen.push([n, a]); return { ok: true }; } };
    expect(await push(db, tr, F)).toEqual({ sent: 1, rejected: 0 });
    expect(seen).toEqual([['complete_spray_job', { p_job: 'j1', p_ended_at: '2026-11-20T08:00:00Z', p_started_at: '2026-11-20T07:30:00Z', p_note: null, p_late_reason: null }]]);
    expect(pendingOps.value).toBe(0);
  });
});
