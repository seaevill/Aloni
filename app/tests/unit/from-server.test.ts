import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseInstant, phiEnd, parsePhiDays } from '@aloni/rules-core';
import type { Row } from '../../src/db/schema';
import { statusOf, withSignOff } from '../../src/labels/label-use';
import { put, putSetting } from '../../src/repo';
import { restoreBackup, makeBackup, parseBackup } from '../../src/repo/backup';
import { canonicalInstant, decimalText, fromServer } from '../../src/repo/from-server';
import { applyPulled } from '../../src/repo/sync-apply';
import { harvestGate } from '../../src/spray/harvest';
import { buildCorrection } from '../../src/spray/spray';
import { push, toWire, type Transport } from '../../src/sync/engine';
import { TEST_FARM_ID as F, newDb } from '../helpers/factories';

// Rows as pull() hands them out: to_jsonb of the table row (numbers for numeric columns, three sign-off columns, «not on label» flags, `+00:00` timestamps with
// microseconds, server-owned columns). The shapes follow the local Postgres run of docs/reviews/team/2026-11-28-evaluation/5-data.md (F1); a machine-made fixture
// from a real pull() is the separate item ev-8.
const id = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const SIGN = { by: 'Agronomist', on: '2026-11-20', fingerprint: '' };
const serverLabel = (over: Record<string, unknown> = {}): Row => ({
  id: id(1), farm_id: F, product_id: id(2), crop_id: id(3), target: 'x', source: 's', dose_kind: 'single', dose_unit: 'ml/str',
  dose_min: 0.025, dose_max: null, phi_days: 7, rei_hours: 24, max_apps: 3,
  dose_min_not_on_label: false, dose_max_not_on_label: false, phi_days_not_on_label: false, rei_hours_not_on_label: false, max_apps_not_on_label: false,
  sign_off_by: null, sign_off_on: null, sign_off_fingerprint: null,
  created_at: '2026-11-20T08:00:00+00:00', updated_at: '2026-11-20T09:00:00.218993+00:00', deleted_at: null, device_id: 'd', actor_id: 'a', server_seq: 5, ...over,
});
const serverSpray = (over: Record<string, unknown> = {}): Row => ({
  id: id(10), farm_id: F, job_id: id(11), product_id: id(2), applicator_id: id(12), sprayed_at: '2026-11-20T08:00:00+00:00', started_at: '2026-11-20T07:30:00.5+00:00',
  dose_str: 0.025, dose_unit: 'ml/str', qty_str: 4.5, water_l: 100, label_state: 'signed', phi_days: 7, rei_hours: 24, phi_source: 'label',
  phi_until: '2026-11-27T08:00:00.000001+00:00', rei_until: '2026-11-21T08:00:00+00:00', flags: [], created_at: '2026-11-20T08:01:00+00:00',
  chain_no: 12, hash: 'h', prev_hash: 'p', received_at: '2026-11-20T08:01:01+00:00', created_by: 'u', server_seq: 9, device_id: 'd', actor_id: 'a', ...over,
});

describe('fromServer: the server row in the phone shape', () => {
  it('a signed label comes back signed: the three sign-off columns are one sign_off, numbers are exact text', () => {
    const { table, row } = fromServer('label_uses', serverLabel({ sign_off_by: SIGN.by, sign_off_on: SIGN.on, sign_off_fingerprint: 'fp' }));
    expect(table).toBe('label_uses');
    expect(row).toMatchObject({ dose_min: '0.025', phi_days: '7', rei_hours: '24', max_apps: '3', sign_off: { by: 'Agronomist', on: '2026-11-20', fingerprint: 'fp' } });
    for (const k of ['sign_off_by', 'sign_off_on', 'sign_off_fingerprint', 'phi_days_not_on_label', 'server_seq']) expect(row).not.toHaveProperty(k);
    expect(row).not.toHaveProperty('dose_max'); // an empty value is absent, as on the phone
  });

  it('a «not on label» flag becomes the text the phone reads', () => {
    const { row } = fromServer('label_uses', serverLabel({ phi_days: null, phi_days_not_on_label: true, max_apps: null, max_apps_not_on_label: true }));
    expect(row).toMatchObject({ phi_days: 'not_on_label', max_apps: 'not_on_label', rei_hours: '24' });
  });

  it('escape attempt: a partial signature is NO signature (never a half-signed label)', () => {
    for (const part of [{ sign_off_by: 'A' }, { sign_off_by: 'A', sign_off_on: '2026-11-20' }, { sign_off_on: '2026-11-20', sign_off_fingerprint: 'f' }]) {
      expect(fromServer('label_uses', serverLabel(part)).row).not.toHaveProperty('sign_off');
    }
  });

  it('every server-owned column goes, chain_no included; text numbers and instants are in the phone form', () => {
    const { row } = fromServer('job_spray', serverSpray());
    for (const k of ['chain_no', 'hash', 'prev_hash', 'received_at', 'created_by', 'server_seq']) expect(row).not.toHaveProperty(k);
    expect(row).toMatchObject({ dose_str: '0.025', qty_str: '4.5', water_l: '100', phi_days: '7', rei_hours: '24', flags: [] });
    expect(row.sprayed_at).toBe('2026-11-20T08:00:00Z');
    expect(fromServer('stock_movements', { id: id(20), farm_id: F, qty_str: 1, qty: -1 }).row).toEqual({ id: id(20), farm_id: F, qty_str: '1' });
  });

  it('end times round UP, never down (a waiting period never shortens); whole seconds and dates stay as they are', () => {
    expect(canonicalInstant('2026-11-20T08:00:00.000001+00:00')).toBe('2026-11-20T08:00:01Z');
    expect(canonicalInstant('2026-11-20T08:00:00.218993+00:00')).toBe('2026-11-20T08:00:01Z');
    expect(canonicalInstant('2026-11-20T08:00:00.000Z')).toBe('2026-11-20T08:00:00Z');
    expect(canonicalInstant('2026-11-20T10:00:00+02:00')).toBe('2026-11-20T08:00:00Z');
    expect(canonicalInstant('2026-11-20T10:00:00+02')).toBe('2026-11-20T08:00:00Z');
    expect(canonicalInstant('2026-11-20')).toBe('2026-11-20');
    expect(canonicalInstant('not a time')).toBe('not a time');
    const { row } = fromServer('job_spray', serverSpray());
    expect(row.phi_until).toBe('2026-11-27T08:00:01Z');
    expect(row.started_at).toBe('2026-11-20T07:30:01Z');
  });

  it('the rules read the pulled instants and the waiting period (they rejected +00:00 and microseconds before)', () => {
    const { row } = fromServer('job_spray', serverSpray({ sprayed_at: '2026-11-20T08:00:00.123456+00:00' }));
    expect(parseInstant(String(row.sprayed_at)).known).toBe(true);
    expect(phiEnd(String(row.sprayed_at), parsePhiDays(String(row.phi_days))).known).toBe(true);
  });

  it('numbers without an honest text form are dropped (unknown), exponents are written out', () => {
    expect(decimalText(1e-7)).toBe('0.0000001'); expect(decimalText(-1.5e-7)).toBe('-0.00000015');
    expect(decimalText(0.025)).toBe('0.025');
    expect(decimalText(Number.NaN)).toBeUndefined();
    expect(decimalText(1e30)).toBeUndefined();
    expect(fromServer('parcels', { id: id(30), farm_id: F, area_str: 1e30, lat: 37.99 }).row).toEqual({ id: id(30), farm_id: F, lat: 37.99 });
  });

  it('farm_settings is the phone\'s settings', () => {
    expect(fromServer('farm_settings', { farm_id: F, key: 'controller', value: { name: 'N' }, server_seq: 1, created_at: '2026-11-20T08:00:00+00:00' })).toEqual({ table: 'settings', row: { key: 'controller', value: { name: 'N' } } });
  });

  it('contract: every pulled row, once converted, has only columns the phone writes (supabase/tests/phone-columns.json)', () => {
    const cols = JSON.parse(readFileSync(new URL('../../../supabase/tests/phone-columns.json', import.meta.url), 'utf8')) as Record<string, string[]>;
    const rows: Array<[string, Row]> = [
      ['label_uses', serverLabel({ sign_off_by: 'A', sign_off_on: '2026-11-20', sign_off_fingerprint: 'f' })], ['job_spray', serverSpray()],
      ['stock_movements', { id: id(20), farm_id: F, lot_key: id(6), product_id: id(2), direction: 'out', qty_str: 1, qty: -1, reason: 'x', created_at: '2026-11-20T08:00:00+00:00', device_id: 'd', actor_id: 'a', server_seq: 3 }],
      ['plantings', { id: id(21), farm_id: F, parcel_id: id(22), crop_id: id(3), area_str: 0.25, area_m2: 998.5, sown_on: '2026-11-10', status: 'growing', created_at: '2026-11-20T08:00:00+00:00', updated_at: '2026-11-20T08:00:00+00:00', deleted_at: null, device_id: 'd', actor_id: 'a', server_seq: 4 }],
    ];
    for (const [table, r] of rows) for (const k of Object.keys(fromServer(table, r).row)) expect(cols[table], `${table}.${k}`).toContain(k);
  });
});

describe('a pull after the phone\'s own write', () => {
  const quiet: Transport = { applyOps: async (ops) => ops.map((o) => ({ op_id: String(o.op_id), status: 'applied' as const })), pull: async () => ({ rows: [], more: false, reset: false, cursor: null }), rpc: async () => ({ ok: true }) };

  it('a signed label stays signed (with its note) after it was sent and pulled back; harvest is not blocked by it', async () => {
    const db = await newDb();
    const lu: Row = { id: id(1), farm_id: F, product_id: id(2), crop_id: id(3), target: 'x', dose_kind: 'single', dose_unit: 'ml/str', dose_min: '0.025', phi_days: '7', rei_hours: '24', max_apps: '3', created_at: '2026-11-20T08:00:00.000Z', updated_at: '2026-11-20T08:00:00.000Z' };
    const signed = withSignOff(lu, 'Agronomist', '2026-11-20', '2026-11-20T09:00:00.000Z', { note: 'by phone' })!;
    await put(db, 'label_uses', signed, 'insert');
    expect(statusOf((await db.label_uses.get(id(1)))!)).toBe('signed');
    await push(db, quiet, F);   // acked: the next pull is no longer held back by the pending op
    const s = signed.sign_off as { by: string; on: string; fingerprint: string };
    await applyPulled(db, F, [{ table: 'label_uses', row: serverLabel({ sign_off_by: s.by, sign_off_on: s.on, sign_off_fingerprint: s.fingerprint }) }]);
    const after = (await db.label_uses.get(id(1)))!;
    expect(statusOf(after)).toBe('signed');
    expect(after.sign_off).toMatchObject({ by: 'Agronomist', note: 'by phone' });
  });

  it('a label the server shows UNSIGNED is not signed here either; a signature of other values never survives as signed', async () => {
    const db = await newDb();
    await applyPulled(db, F, [{ table: 'label_uses', row: serverLabel() }]);
    expect(statusOf((await db.label_uses.get(id(1)))!)).toBe('unsigned');
    await applyPulled(db, F, [{ table: 'label_uses', row: serverLabel({ phi_days: 3, sign_off_by: 'A', sign_off_on: '2026-11-20', sign_off_fingerprint: 'not-the-fingerprint' }) }]);
    expect(statusOf((await db.label_uses.get(id(1)))!)).toBe('changed');
  });

  it('a pulled spray: the harvest gate reads its waiting period, and its correction carries no server-owned column (chain_no)', async () => {
    const db = await newDb();
    const phoneLabel = withSignOff({ id: id(1), farm_id: F, product_id: id(2), crop_id: id(3), target: 'x', dose_kind: 'single', dose_unit: 'ml/str', dose_min: '0.025', phi_days: '7', rei_hours: '24', max_apps: '3' }, 'A', '2026-11-20', '2026-11-20T09:00:00Z')!;
    const so = phoneLabel.sign_off as { by: string; on: string; fingerprint: string };
    await applyPulled(db, F, [{ table: 'job_spray', row: serverSpray() }, { table: 'label_uses', row: serverLabel({ sign_off_by: so.by, sign_off_on: so.on, sign_off_fingerprint: so.fingerprint }) }]);
    const sp = (await db.job_spray.get(id(10)))!;
    expect(sp).toMatchObject({ phi_days: '7', rei_hours: '24', dose_str: '0.025' });
    const label = (await db.label_uses.get(id(1)))!;
    const planting: Row = { id: id(50), farm_id: F, crop_id: id(3), status: 'growing' };
    const links: Row[] = [{ id: id(51), farm_id: F, planting_id: id(50), job_id: id(11) }];
    expect(harvestGate(id(50), '2026-11-21T08:00:00Z', links, [sp], [planting], [label])).toMatchObject({ ok: false, reason: 'running' }); // known and running, not «unknown»
    expect(harvestGate(id(50), '2026-12-05T08:00:00Z', links, [sp], [planting], [label])).toEqual({ ok: true });
    const input = { dose: '0,03', doseUnit: 'ml/str' as const, sprayedAt: '2026-11-20T08:30:00Z', applicatorId: id(12), qty: '', water: '', note: '', reason: 'typo' };
    const fix = buildCorrection(sp, input, { movements: [], lotBalance: undefined }, F, '2026-11-21T08:00:00Z', { spray: id(40), moveIn: id(41), moveOut: id(42) });
    expect(fix.ok).toBe(true);
    if (fix.ok) for (const k of ['chain_no', 'hash', 'prev_hash', 'received_at', 'created_by', 'server_seq']) expect(fix.spray, k).not.toHaveProperty(k);
  });

  it('an owner setting comes to a new phone; this phone\'s own pending change and device-only keys are not replaced', async () => {
    const db = await newDb();
    await applyPulled(db, F, [{ table: 'farm_settings', row: { farm_id: F, key: 'controller', value: { name: 'Server' }, server_seq: 1 } }]);
    expect((await db.settings.get('controller'))?.value).toEqual({ name: 'Server' });
    await putSetting(db, F, 'business', { v: 'mine' });   // pending: the phone's own version wins
    await applyPulled(db, F, [{ table: 'farm_settings', row: { farm_id: F, key: 'business', value: { v: 'server' } } }, { table: 'farm_settings', row: { farm_id: F, key: 'device_id', value: 'evil' } }, { table: 'farm_settings', row: { farm_id: 'other', key: 'x', value: 1 } }]);
    expect((await db.settings.get('business'))?.value).toEqual({ v: 'mine' });
    expect((await db.settings.get('device_id'))?.value).not.toBe('evil');
    expect(await db.settings.get('x')).toBeUndefined();
  });

  it('a pulled record sent back by an edit carries no server-owned column', async () => {
    const db = await newDb();
    await applyPulled(db, F, [{ table: 'label_uses', row: serverLabel() }]);
    const row = (await db.label_uses.get(id(1)))!;
    await put(db, 'label_uses', { ...row, target: 'y' }, 'update');
    const op = (await db.outbox.toArray()).map(toWire).find((w) => w.row_id === id(1))!;
    expect(Object.keys(op.row as object).filter((k) => /server_seq|_not_on_label|sign_off_/.test(k))).toEqual([]);
  });
});

describe('restore compares points in time, not text', () => {
  it('the same instant in two formats is not «newer»: the record on the phone is kept and listed', async () => {
    const a = await newDb();
    await put(a, 'parcels', { id: 'p-1', farm_id: F, name: 'From file', area_str: '0.5', updated_at: '2026-11-20T08:00:00Z' }, 'insert');
    const file = parseBackup(JSON.stringify(await makeBackup(a, { id: F, name: 'T' }, 'test')));
    const b = await newDb();
    await put(b, 'parcels', { id: 'p-1', farm_id: F, name: 'On the phone', area_str: '0.5', updated_at: '2026-11-20T08:00:00.000Z' }, 'insert');
    const r = await restoreBackup(b, file, F);
    expect(r.skipped).toHaveLength(1);
    expect((await b.parcels.get('p-1'))?.name).toBe('On the phone');
  });
});
