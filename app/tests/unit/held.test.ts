import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { isDeviceOnlyKey } from '../../src/repo/backup';
import { cancelHeld, commitAllHeld, commitHeld, holdAction, readHeld, type Held } from '../../src/worker/held';
import { newDb } from '../helpers/factories';

const obs = (id: string): Held => ({ id, at: `2026-11-20T10:00:0${id.length}Z`, writes: [{ table: 'observations', row: { id: `o-${id}`, farm_id: 'f', parcel_id: 'p', kind: 'pest', observed_at: 'x', created_at: 'x' }, op: 'insert' }] });
describe('held actions (T4)', () => {
  it('different entries never overwrite each other: holding B while A is cancelled keeps B', async () => {
    const db = await newDb();
    await holdAction(db, obs('a'));
    await Promise.all([cancelHeld(db, 'a'), holdAction(db, obs('bb'))]);
    expect((await readHeld(db)).map((h) => h.id)).toEqual(['bb']);
  });
  it('an undone entry writes nothing; a committed one writes its record once and leaves no entry; a second commit changes nothing', async () => {
    const db = await newDb();
    await holdAction(db, obs('a')); await cancelHeld(db, 'a'); await commitHeld(db, 'a');
    expect(await db.observations.count()).toBe(0);
    await holdAction(db, obs('c'));
    await commitHeld(db, 'c'); await commitHeld(db, 'c');
    expect(await db.observations.count()).toBe(1); expect(await readHeld(db)).toEqual([]);
  });
  it('at the next start everything still pending is written', async () => {
    const db = await newDb();
    await holdAction(db, obs('a')); await holdAction(db, obs('bb'));
    expect(await commitAllHeld(db)).toBe(2);
    expect(await db.observations.count()).toBe(2); expect(await readHeld(db)).toEqual([]);
  });
  it('the entries are device-only: never part of a backup', () => { expect(isDeviceOnlyKey('held_action:abc')).toBe(true); expect(isDeviceOnlyKey('controller')).toBe(false); });
});
