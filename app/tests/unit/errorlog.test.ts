import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { clearErrors, formatReport, readErrors, recordError, scrub } from '../../src/diag/errorlog';
import { newDb } from '../helpers/factories';

// A local error log (no tracking): app errors are kept ONLY on the phone, in the device-local settings (never synced), at most 30, scrubbed of ids and addresses. The owner copies a report and sends it herself; nothing is sent over the network.
describe('scrub', () => {
  it('replaces ids and cuts addresses down to their path; long text is shortened', () => {
    const t = scrub('failed for 3fa85f64-5717-4562-b3fc-2c963f66afa6 at https://example.org/app/#/own/today/sheet/job/abc?token=secret and https://example.org/x?y=1');
    expect(t).not.toMatch(/3fa85f64|token=secret|#\/own|\?y=1/);
    expect(t).toContain('<id>'); expect(t).toContain('https://example.org/app/');
    expect(scrub('x'.repeat(2000)).length).toBeLessThanOrEqual(600);
  });
});

describe('the log', () => {
  it('keeps the newest 30, newest first, in the device-local settings', async () => {
    const db = await newDb();
    for (let i = 0; i < 35; i++) await recordError(db, { kind: 'error', message: `boom ${i}`, stack: 'at f (a.js:1:1)' }, `2026-11-21T10:${String(i).padStart(2, '0')}:00.000Z`);
    const rows = await readErrors(db);
    expect(rows).toHaveLength(30);
    expect(rows[0]!.message).toBe('boom 34'); expect(rows[29]!.message).toBe('boom 5');
    expect((await db.outbox.count())).toBe(0);                                     // never queued for the server
  });
  it('clears; an unreadable stored value is an empty log, not a crash', async () => {
    const db = await newDb();
    await recordError(db, { kind: 'rejection', message: 'x', stack: '' }, '2026-11-21T10:00:00.000Z');
    await clearErrors(db); expect(await readErrors(db)).toEqual([]);
    await db.settings.put({ key: 'error_log', value: 'garbage' }); expect(await readErrors(db)).toEqual([]);
  });
});

describe('formatReport', () => {
  it('is plain text with the version, the phone and the errors, and says nothing about the farm', () => {
    const t = formatReport([{ at: '2026-11-21T10:00:00.000Z', kind: 'error', message: 'boom', stack: 'at f (a.js:1:1)' }], { version: '0.1.0', ua: 'Mozilla/5.0 (iPhone)', lang: 'el' });
    expect(t).toContain('0.1.0'); expect(t).toContain('iPhone'); expect(t).toContain('boom'); expect(t).toContain('2026-11-21T10:00:00.000Z');
    expect(t).not.toMatch(/parcel|farm|customer|worker/i);
  });
  it('an empty log says so', () => { expect(formatReport([], { version: '0.1.0', ua: 'x', lang: 'el' })).toContain('no errors'); });
});
