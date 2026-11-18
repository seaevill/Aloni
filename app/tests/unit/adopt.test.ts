import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { adoptFarm } from '../../src/db/adopt';
import { putMany } from '../../src/repo';
import { newDb } from '../helpers/factories';

const SERVER_FARM = '22222222-2222-4222-8222-222222222222';

describe('the server\'s farm id becomes the phone\'s farm id', () => {
  it('a fresh phone takes it; the same id changes nothing', async () => {
    const db = await newDb();
    await db.farms.put({ id: 'local-1', name: 'Aloni', is_demo: false });
    expect(await adoptFarm(db, SERVER_FARM)).toBe('adopted');
    expect((await db.farms.filter((f) => !f.is_demo).toArray()).map((f) => f.id)).toEqual([SERVER_FARM]);
    expect(await adoptFarm(db, SERVER_FARM)).toBe('same');
  });

  it('a phone that already holds records (or unsent changes) refuses: nothing is relabelled or merged', async () => {
    const db = await newDb();
    await db.farms.put({ id: 'local-2', name: 'Aloni', is_demo: false });
    await putMany(db, [{ table: 'parcels', row: { id: 'p1', farm_id: 'local-2', name: 'Mine', area_str: '1' }, op: 'insert' }]);
    expect(await adoptFarm(db, SERVER_FARM)).toBe('refused');
    expect((await db.farms.filter((f) => !f.is_demo).toArray()).map((f) => f.id)).toEqual(['local-2']);
    expect(await db.parcels.get('p1')).toBeTruthy();
  });

  it('the demo farm is never touched', async () => {
    const db = await newDb();
    await db.farms.put({ id: 'demo-x', name: 'Demo', is_demo: true });
    expect(await adoptFarm(db, SERVER_FARM)).toBe('adopted');
    expect(await db.farms.get('demo-x')).toBeTruthy();
  });
});
