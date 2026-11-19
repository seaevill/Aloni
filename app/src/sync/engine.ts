// The sync engine: the outbox goes to the server (apply_ops), the server's changes come back (pull). PURE of any network: it talks to a Transport, so it is
// tested against a fake server. Nothing here runs unless config.SYNC_CONNECTED is true and a Transport exists (the live switch is Bora's, after the
// 0001–0017 migrations and a real account trial). Every call is safe to repeat: ops carry their op_id, pull is a cursor.
import type { AppDB, OutboxRow, Row } from '../db/schema';
import { RPC_PREFIX } from '../repo';
import { applyPulled, getCursor, markAcked, markRejected, setCursor, type ServerAnswer } from '../repo/sync-apply';

export interface PulledRow { table: string; x: string; seq: number; row: Row }
export interface PullAnswer { rows: PulledRow[]; more: boolean; reset: boolean; cursor: unknown }
export interface Transport {
  /** One call = one batch of ops; the answer lists one entry per op (op_id, status, and for a refusal code + reason). */
  applyOps(ops: readonly Record<string, unknown>[]): Promise<Array<ServerAnswer & { op_id: string }>>;
  pull(farmId: string, cursor: unknown, limit: number): Promise<PullAnswer>;
  /** A queued server call (rpc:<name> in the outbox). ok:false = the server REFUSED it (final); a network or server failure THROWS (the op stays pending). */
  rpc(name: string, args: Record<string, unknown>): Promise<{ ok: true } | { ok: false; code: string; reason: string }>;
}

const BATCH = 50;
const PULL_LIMIT = 500;

/** The op as the server wants it: the queue entry plus the group fields (the server applies one phone transaction all or none). */
export const toWire = (o: OutboxRow): Record<string, unknown> => ({
  op_id: o.op_id, farm_id: o.farm_id, table: o.table, row_id: o.row_id, op: o.op, row: o.row, device_id: o.device_id, actor_id: o.actor_id, at: o.at,
  ...(o.group_id ? { group_id: o.group_id, group_size: o.group_size } : {}),
});

/** On the same instant a parent goes before its children (a parcel before its planting, a job before its spray): the server checks references. */
const RANK = ['media', 'parcels', 'crops', 'products', 'workers', 'label_uses', 'stock_lots', 'plantings', 'jobs', 'job_plantings', 'job_spray', 'stock_movements', 'job_harvest', 'soil_tests', 'water_tests', 'observations', 'farm_settings'];
const rankOf = (table: string): number => RANK.indexOf(table);   // a table not listed (none exists) sorts first

/** Pending ops in the order they were written, cut into batches that NEVER split a group (a group is sent whole or not at all). */
export function batches(pending: readonly OutboxRow[]): OutboxRow[][] {
  const ordered = [...pending].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : rankOf(a.table) - rankOf(b.table)));
  const units: OutboxRow[][] = [];
  for (const o of ordered) { const last = units[units.length - 1]; if (o.group_id && last?.[0]?.group_id === o.group_id) last.push(o); else units.push([o]); }
  const out: OutboxRow[][] = [];
  for (const u of units) { const cur = out[out.length - 1]; if (cur && cur.length + u.length <= BATCH) cur.push(...u); else out.push([...u]); }
  return out;
}

/** Sends everything pending for one farm. Accepted (or already known) ops leave the queue; refused ones stay, with the server's reason. A network error stops quietly: the ops stay pending. */
export async function push(db: AppDB, tr: Transport, farmId: string): Promise<{ sent: number; rejected: number }> {
  const all = await db.outbox.where('farm_id').equals(farmId).and((o) => o.status === 'pending').toArray();
  const pending = all.filter((o) => !o.table.startsWith(RPC_PREFIX));
  let sent = 0; let rejected = 0;
  for (const o of [...all.filter((x) => x.table.startsWith(RPC_PREFIX))].sort((a, b) => (a.at < b.at ? -1 : 1))) { // queued server calls, one by one, in the order they were made
    const r = await tr.rpc(o.table.slice(RPC_PREFIX.length), o.row as Record<string, unknown>);
    if (r.ok) { await markAcked(db, [o.op_id]); sent++; } else { await markRejected(db, new Map([[o.op_id, { status: 'rejected', code: r.code, reason: r.reason }]])); rejected++; }
  }
  for (const b of batches(pending)) {
    const answers = new Map((await tr.applyOps(b.map(toWire))).map((a) => [a.op_id, a] as const));
    const ok: string[] = []; const bad = new Map<string, ServerAnswer>();
    for (const o of b) {
      const a = answers.get(o.op_id);
      if (a?.status === 'applied' || a?.status === 'duplicate') ok.push(o.op_id);
      else bad.set(o.op_id, a ?? { status: 'rejected', code: 'no_answer', reason: 'the server gave no answer for this op' });
    }
    if (ok.length) await markAcked(db, ok);
    if (bad.size) await markRejected(db, bad);
    sent += ok.length; rejected += bad.size;
  }
  return { sent, rejected };
}

/** Fetches what changed on the server since this phone's cursor. A `reset` (another generation of the server, or other jobs visible to this worker) means «everything again»: the rows are simply applied again, which is safe. */
export async function pull(db: AppDB, tr: Transport, farmId: string): Promise<{ written: number; reset: boolean }> {
  let cursor: unknown = await getCursor(db, farmId);
  let written = 0; let reset = false;
  for (let guard = 0; guard < 1000; guard++) {
    const a = await tr.pull(farmId, cursor, PULL_LIMIT);
    reset = reset || a.reset;
    written += await applyPulled(db, farmId, a.rows.map((r) => ({ table: r.table, row: r.row })));
    cursor = a.cursor;
    await setCursor(db, farmId, cursor); // after the rows are in: a crash in between only repeats a page
    if (!a.more) break;
  }
  return { written, reset };
}

/** One round: push, then pull. */
export async function syncOnce(db: AppDB, tr: Transport, farmId: string) {
  const p = await push(db, tr, farmId);
  const q = await pull(db, tr, farmId);
  return { sent: p.sent, rejected: p.rejected, written: q.written, reset: q.reset };
}
