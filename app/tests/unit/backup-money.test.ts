import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { DEMO_FARM_ID } from '../../src/config';
import { makeBackup, parseBackup, restoreBackup } from '../../src/repo/backup';
import { putLocal, putSetting } from '../../src/repo';
import { TEST_FARM_ID, newDb } from '../helpers/factories';

const farm = { id: TEST_FARM_ID, name: 'Test farm' };
const entry = { id: 'm1', day: '2026-11-01', dir: 'out', category: 'fuel', cents: 1000, note: '', at: 't' };

// Independent review 2026-11-25, MUST 1: the Ταμείο ledger stays on the phone. It is in the backup, but never queued for the server on a restore, and the Demo ledger never travels in a real backup.
describe('Ταμείο ledger and backups', () => {
  it('the real ledger is backed up, the fictional Demo ledger is not', async () => {
    const a = await newDb();
    await putLocal(a, `money:${TEST_FARM_ID}`, [entry]);
    await putLocal(a, `money:${DEMO_FARM_ID}`, [{ ...entry, id: 'demo-money-1' }]);
    const keys = (await makeBackup(a, farm, 'test')).settings.map((s) => s.key);
    expect(keys).toContain(`money:${TEST_FARM_ID}`);
    expect(keys).not.toContain(`money:${DEMO_FARM_ID}`);
  });
  it('a restore onto a phone with another farm id queues NO money row for the server and ignores a demo ledger inside the file', async () => {
    const a = await newDb();
    await putLocal(a, `money:${TEST_FARM_ID}`, [entry]);
    const backup = parseBackup(JSON.stringify(await makeBackup(a, farm, 'test')));
    backup.settings.push({ key: `money:${DEMO_FARM_ID}`, value: [{ ...entry, id: 'demo-money-1' }] });
    const b = await newDb();
    await putLocal(b, 'money:old-farm', [{ ...entry, id: 'old' }]);          // this phone's own old ledger
    await putSetting(b, 'old-farm', 'controller', { name: 'x' });             // a normal synced setting: still re-queued
    await restoreBackup(b, backup, 'old-farm');
    const queued = (await b.outbox.toArray()).map((o) => JSON.stringify(o));
    expect(queued.some((q) => q.includes('money:'))).toBe(false);
    expect(await b.settings.get(`money:${DEMO_FARM_ID}`)).toBeUndefined();
    expect((await b.settings.get(`money:${TEST_FARM_ID}`))?.value).toEqual([entry]);
  });
});
