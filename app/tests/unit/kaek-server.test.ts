import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { archived } from '../../src/parcels/parcel';
import { kaekOnRow, saveKaekOnRow, setKaek, loadKaek } from '../../src/kaek/kaek';
import { put, putLocal } from '../../src/repo';
import { READINESS_KEY } from '../../src/settings/readiness';
import { TEST_FARM_ID as F, newDb, putParcel } from '../helpers/factories';

// SQL 0042 parcels.kaek: exactly 12 digits or nothing, every change with a REASON (the parcel edit history), the row keeps the number when another field is edited or the parcel is archived.
describe('ΚΑΕΚ on the parcel row (server mode)', () => {
  it('needs a reason, keeps the history, refuses anything but 12 digits, removal = no field + a reason', async () => {
    const db = await newDb();
    const parcel = await putParcel(db);
    const id = String(parcel.id);
    expect(await saveKaekOnRow(db, id, '123', 'x')).toBe('bad');
    expect(await saveKaekOnRow(db, id, '123456789012', '')).toBe('reason');
    expect(await kaekOnRow(db, id)).toBeUndefined();
    expect(await saveKaekOnRow(db, id, '123456789012', 'από το κτηματολόγιο')).toBe('ok');
    expect(await kaekOnRow(db, id)).toBe('123456789012');
    const row = await db.parcels.get(id);
    expect(row).toMatchObject({ edit_reason: 'από το κτηματολόγιο', edits: [{ reason: 'από το κτηματολόγιο', before: { kaek: null } }] });
    expect(await saveKaekOnRow(db, id, '123456789012', 'again')).toBe('nochange');
    expect((await db.outbox.toArray()).filter((o) => o.table === 'parcels' && o.op === 'update').length).toBeGreaterThan(0);
    expect(archived(row!, 'n').kaek).toBe('123456789012');                           // archiving never wipes it
    expect(await saveKaekOnRow(db, id, undefined, 'λάθος αριθμός')).toBe('ok');
    expect('kaek' in (await db.parcels.get(id))!).toBe(false);
    expect(await saveKaekOnRow(db, 'missing', '123456789012', 'x')).toBe('missing');
  });
  it('a number typed on the phone before stays readable there and never reaches the parcel row by itself', async () => {
    const db = await newDb();
    const p = await putParcel(db); await put(db, 'parcels', p);
    await setKaek(db, F, String(p.id), '999999999999');
    await putLocal(db, READINESS_KEY, { migration: '0042' });
    expect(await kaekOnRow(db, String(p.id))).toBeUndefined();
    expect((await loadKaek(db, F))[String(p.id)]).toBe('999999999999');
  });
});
