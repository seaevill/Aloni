import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { AppDB, type Row } from '/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/Aloni/app/src/db/schema';
import { put } from '/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/Aloni/app/src/repo';
import { applyPulled } from '/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/Aloni/app/src/repo/sync-apply';
import { push, type Transport } from '/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/Aloni/app/src/sync/engine';
import { withSignOff, statusOf } from '/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/Aloni/app/src/labels/label-use';
const F = '11111111-1111-4111-8111-111111111111';
describe('PROBE pull round trip', () => {
  it('D14 the owner\'s own SIGNED label use, after one sync round, comes back in server shape and reads as not signed', async () => {
    const db = new AppDB('rt-' + crypto.randomUUID()); await db.open();
    const lu: Row = { id: 'lu1', farm_id: F, product_id: 'p', crop_id: 'c', target: 'x', dose_kind: 'single', dose_unit: 'ml/str', dose_min: '0,025', phi_days: '7', rei_hours: '24', max_apps: '2', created_at: '2026-11-20T08:00:00Z', updated_at: '2026-11-20T08:00:00Z' };
    const signed = withSignOff(lu, 'Agronomist', '2026-11-20', '2026-11-20T09:00:00Z')!;
    await put(db, 'label_uses', signed, 'insert');
    console.log('D14 before sync status', statusOf((await db.label_uses.get('lu1'))!));
    const tr: Transport = { applyOps: async (ops) => ops.map((o) => ({ op_id: String(o.op_id), status: 'applied' as const })), pull: async () => ({ rows: [], more: false, reset: false, cursor: null }), rpc: async () => ({ ok: true }) };
    await push(db, tr, F);
    // what pull() hands back for that row (shape taken from the local Postgres run of 0001-0042: numbers, three sign-off columns, +00:00 timestamps)
    const s = signed.sign_off as { by: string; on: string; fingerprint: string };
    const server: Row = { id: 'lu1', farm_id: F, product_id: 'p', crop_id: 'c', target: 'x', dose_kind: 'single', dose_unit: 'ml/str', dose_min: 0.025, dose_max: null, phi_days: 7, rei_hours: 24, max_apps: 2, sign_off_by: s.by, sign_off_on: s.on, sign_off_fingerprint: s.fingerprint, phi_days_not_on_label: false, rei_hours_not_on_label: false, created_at: '2026-11-20T08:00:00+00:00', updated_at: '2026-11-20T09:00:00+00:00', server_seq: 5 };
    await applyPulled(db, F, [{ table: 'label_uses', row: server }]);
    const after = (await db.label_uses.get('lu1'))!;
    console.log('D14 after sync status', statusOf(after), 'sign_off', JSON.stringify(after.sign_off));
    expect(statusOf(after)).toBe('signed');
  });
});
