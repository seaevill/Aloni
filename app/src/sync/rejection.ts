// B6: what to tell the owner about a record the server REFUSED. Plain words: what it was, why it was refused, what to do. Nothing is guessed: an unknown reason says «unknown» and keeps the server's own words.
// The record itself is never deleted by a refusal; it stays on the phone.
export interface Explained { what: string | undefined; why: string; fix: string; raw: string }

const WHAT: Record<string, string> = {
  parcels: 'rejected.what.parcels', plantings: 'rejected.what.plantings', job_spray: 'rejected.what.job_spray', job_harvest: 'rejected.what.job_harvest', jobs: 'rejected.what.jobs',
  stock_movements: 'rejected.what.stock_movements', label_uses: 'rejected.what.label_uses', observations: 'rejected.what.observations', 'rpc:complete_spray_job': 'rejected.what.rpc_complete_spray_job', 'rpc:claim_job': 'rejected.what.rpc_claim_job',
};
const REASONS: Array<[RegExp, string, string]> = [
  [/^taken$/i, 'rejected.why.taken', 'rejected.fix.none'],
  [/harvest blocked/i, 'rejected.why.harvest_blocked', 'rejected.fix.wait_or_sign'],
  [/in the future/i, 'rejected.why.future', 'rejected.fix.clock'],
  [/more than 7 days back|reason for the delay/i, 'rejected.why.late', 'rejected.fix.reason'],
  [/waiting period must equal|signed label use|no label with a known waiting/i, 'rejected.why.label_mismatch', 'rejected.fix.owner_label'],
  [/already done|is not open|not a spraying job/i, 'rejected.why.job_closed', 'rejected.fix.none'],
  [/row-level security|not available to you|sign in first|permission denied/i, 'rejected.why.permission', 'rejected.fix.sign_in'],
];

export function explainRejection(table: string, reason: string | undefined, _code: string | undefined): Explained {
  const raw = reason ?? '';
  const hit = REASONS.find(([re]) => re.test(raw));
  return { what: WHAT[table], why: hit ? hit[1] : 'rejected.why.unknown', fix: hit ? hit[2] : 'rejected.fix.tell_owner', raw };
}
