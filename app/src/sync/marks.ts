// E3: the per-record sync mark, from the outbox alone. «phone» = still waiting to be sent, «sent» = the server confirmed it, «rejected» = the server refused it (it stays on the phone).
// A record the outbox does not hold gets no mark: the app never claims «sent» for something it has no confirmation for.
export type Mark = 'phone' | 'sent' | 'rejected';
const RANK: Record<Mark, number> = { sent: 0, phone: 1, rejected: 2 };
const OF = { pending: 'phone', acked: 'sent', rejected: 'rejected' } as const;

export function recordMarks(ops: readonly { row_id: string; status: 'pending' | 'acked' | 'rejected' }[]): Map<string, Mark> {
  const out = new Map<string, Mark>();
  for (const o of ops) {
    const m: Mark = OF[o.status];
    const have = out.get(o.row_id);
    if (have === undefined || RANK[m] > RANK[have]) out.set(o.row_id, m);
  }
  return out;
}
