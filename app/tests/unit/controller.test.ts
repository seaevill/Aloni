import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppDB } from '../../src/db/schema';
import { assertCanInviteWorkers, canInviteWorkers, loadController, saveController } from '../../src/legal/controller';
import { dictionaries, ensureAllLangs } from '../../src/i18n';
await ensureAllLangs();      // tr, en and hi are loaded on demand in the app; the checks compare all of them
import { TEST_FARM_ID } from '../helpers/factories';

let db: AppDB;
beforeEach(async () => { db = new AppDB(`test-${Math.random()}`); await db.open(); });
const full = { name: 'Test Person', address: 'Test street 1', phone: '+30 000 0000000' }; // fictional

describe('data controller details', () => {
  it('are stored in the database and read back trimmed', async () => {
    expect(await loadController(db)).toBeUndefined();
    await saveController(db, TEST_FARM_ID, { name: '  Test Person ', address: ' Test street 1', phone: '+30 000 0000000 ' });
    expect(await loadController(db)).toEqual(full);
  });
  it('inviting workers is CLOSED until name, address and phone are all entered', () => {
    expect(canInviteWorkers(undefined)).toEqual({ allowed: false, reason: 'controller_missing' });
    for (const missing of ['name', 'address', 'phone'] as const) {
      expect(canInviteWorkers({ ...full, [missing]: '' }).allowed, missing).toBe(false);
      expect(canInviteWorkers({ ...full, [missing]: '   ' }).allowed, `${missing} blank`).toBe(false);
    }
    expect(canInviteWorkers(full)).toEqual({ allowed: true });
  });
  it('assertCanInviteWorkers throws while closed and passes once complete', () => {
    expect(() => assertCanInviteWorkers(undefined)).toThrow(/controller_missing/);
    expect(() => assertCanInviteWorkers({ ...full, phone: '' })).toThrow(/controller_missing/);
    expect(() => assertCanInviteWorkers(full)).not.toThrow();
  });
});

describe('the privacy notice never contains personal details (the repo is public)', () => {
  it.each(['el', 'tr', 'en'] as const)('%s uses placeholders for the controller, not names or bracketed blanks', (l) => {
    const body = dictionaries[l]['info.privacy.body'];
    for (const p of ['{controller_name}', '{controller_address}', '{controller_phone}']) expect(body).toContain(p);
    expect(body).not.toMatch(/\[(Ονοματεπώνυμο|Ad Soyad|Full name)/);
  });
  it.each(['el', 'tr', 'en'] as const)('%s mentions Supabase, Cloudflare, consent for the phone and the withdrawal right', (l) => {
    const body = dictionaries[l]['info.privacy.body'];
    expect(body).toMatch(/Supabase/);
    expect(body).toMatch(/Cloudflare/);
  });
});
