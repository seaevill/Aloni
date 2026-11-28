import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { DEMO_FARM_ID } from '../../src/config';
import { makeBackup, parseBackup, restoreBackup, BackupError } from '../../src/repo/backup';
import { isDemoKey, putLocal, putSetting } from '../../src/repo';
import { TEST_FARM_ID, newDb } from '../helpers/factories';
const farm = { id: TEST_FARM_ID, name: 'Test farm' };
const DEMO_KEYS = ['cuts', 'fert_plan', 'harvest_plan', 'recurring'].map((p) => `${p}:${DEMO_FARM_ID}`);
// Evaluation 2026-11-28, 5-data F4/F5 (safety rule 4): Demo-farm settings never travel in a real backup and are never queued for the server.
describe('Demo settings stay out of real backups and the server queue', () => {
  it('isDemoKey recognises any key that carries the Demo farm id, and no real key', () => {
    expect([...DEMO_KEYS, `money:${DEMO_FARM_ID}`].every(isDemoKey)).toBe(true);
    expect([`cuts:${TEST_FARM_ID}`, 'controller', 'ui_state'].some(isDemoKey)).toBe(false);
  });
  it('makeBackup drops every Demo-keyed setting but keeps the real one', async () => {
    const a = await newDb();
    for (const k of DEMO_KEYS) await putLocal(a, k, [1]);
    await putLocal(a, `cuts:${TEST_FARM_ID}`, [2]);
    expect((await makeBackup(a, farm, 'test')).settings.map((s) => s.key)).toEqual([`cuts:${TEST_FARM_ID}`]);
  });
  it('parseBackup refuses a file that smuggles a Demo setting in', async () => {
    const a = await newDb();
    const b = await makeBackup(a, farm, 'test');
    b.settings.push({ key: DEMO_KEYS[0] ?? '', value: [1] });
    expect(() => parseBackup(JSON.stringify(b))).toThrow(BackupError);
    try { parseBackup(JSON.stringify(b)); } catch (e) { expect((e as BackupError).code).toBe('demo'); }
  });
  it('an adopting restore does not queue this phone\'s own Demo settings under the real farm', async () => {
    const a = await newDb();
    const backup = parseBackup(JSON.stringify(await makeBackup(a, farm, 'test')));
    const b = await newDb();
    for (const k of DEMO_KEYS) await putLocal(b, k, [1]);
    await putSetting(b, 'old-farm', 'controller', { name: 'x' });
    await restoreBackup(b, backup, 'old-farm');
    const queued = JSON.stringify(await b.outbox.toArray());
    expect([queued.includes(DEMO_FARM_ID), queued.includes('controller')]).toEqual([false, true]);
  });
  it('putSetting for the Demo farm (or a Demo key) writes locally and queues nothing', async () => {
    const a = await newDb();
    await putSetting(a, DEMO_FARM_ID, 'anything', 1);
    await putSetting(a, TEST_FARM_ID, DEMO_KEYS[1] ?? '', 2);
    expect([(await a.settings.get('anything'))?.value, (await a.settings.get(DEMO_KEYS[1] ?? ''))?.value, await a.outbox.count()]).toEqual([1, 2, 0]);
  });
});
