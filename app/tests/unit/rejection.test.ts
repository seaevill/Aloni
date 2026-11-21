import { describe, expect, it } from 'vitest';
import { explainRejection } from '../../src/sync/rejection';

// B6: every record the server refused is explained in plain words (what it was, why it was refused, what to do), never lost; an unknown reason says so honestly and still shows the server's own words.
describe('explainRejection', () => {
  it('names what the record was (a table or a queued call)', () => {
    expect(explainRejection('job_harvest', 'x', '23514').what).toBe('rejected.what.job_harvest');
    expect(explainRejection('job_spray', 'x', undefined).what).toBe('rejected.what.job_spray');
    expect(explainRejection('rpc:complete_spray_job', 'x', undefined).what).toBe('rejected.what.rpc_complete_spray_job');
    expect(explainRejection('some_future_table', 'x', undefined).what).toBeUndefined();          // unknown table: the screen shows the table name as it is
  });
  it('the harvest gate: closed because of a running or unknown waiting period; the fix is to wait or to get the label signed', () => {
    const e = explainRejection('job_harvest', 'harvest blocked: a spray on this planting has an unknown or running waiting (PHI) or re-entry (REI) period', '23514');
    expect(e.why).toBe('rejected.why.harvest_blocked');
    expect(e.fix).toBe('rejected.fix.wait_or_sign');
  });
  it('known reasons get a plain reason and a fix', () => {
    expect(explainRejection('job_harvest', 'harvest time is in the future', undefined)).toMatchObject({ why: 'rejected.why.future', fix: 'rejected.fix.clock' });
    expect(explainRejection('job_spray', 'a spraying more than 7 days back needs the reason for the delay', undefined)).toMatchObject({ why: 'rejected.why.late', fix: 'rejected.fix.reason' });
    expect(explainRejection('job_spray', 'a label waiting period must equal the signed label use it names', undefined)).toMatchObject({ why: 'rejected.why.label_mismatch', fix: 'rejected.fix.owner_label' });
    expect(explainRejection('rpc:complete_spray_job', 'the job is already done', undefined)).toMatchObject({ why: 'rejected.why.job_closed', fix: 'rejected.fix.none' });
    expect(explainRejection('job_harvest', 'new row violates row-level security policy for table "job_harvest"', '42501')).toMatchObject({ why: 'rejected.why.permission', fix: 'rejected.fix.sign_in' });
  });
  it('an unknown reason is said to be unknown (never guessed) and the record stays on the phone', () => {
    const e = explainRejection('job_spray', 'something nobody thought of', 'P0001');
    expect(e).toMatchObject({ why: 'rejected.why.unknown', fix: 'rejected.fix.tell_owner', raw: 'something nobody thought of' });
  });
});
