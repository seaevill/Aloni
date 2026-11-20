import { describe, expect, it } from 'vitest';
import { createFirstFarm, FarmRefused, myFarmIds } from '../../src/auth/gotrue';

const E = { url: 'https://x.example', apiKey: 'pub' };
type Call = { url: string; init: RequestInit };
const fake = (status: number, answer: unknown) => { const calls: Call[] = []; const f = (async (url: string, init: RequestInit) => { calls.push({ url, init }); return { ok: status < 400, status, json: async () => answer }; }) as unknown as typeof fetch; return { f, calls }; };

describe('the first farm is set up by the app itself (0034), never by hand', () => {
  it('asks the server which farms the signed-in person belongs to; a failed answer is an ERROR (unknown is not «none»)', async () => {
    const none = fake(200, []);
    expect(await myFarmIds(E, 'tok', none.f)).toEqual([]);
    expect(none.calls[0]!.url).toBe('https://x.example/rest/v1/farm_members?select=farm_id&limit=1');
    expect(none.calls[0]!.init.headers).toMatchObject({ apikey: 'pub', authorization: 'Bearer tok' });
    expect(await myFarmIds(E, 'tok', fake(200, [{ farm_id: 'f1' }]).f)).toEqual(['f1']);
    await expect(myFarmIds(E, 'tok', fake(503, {}).f)).rejects.toThrow('HTTP 503');
    await expect(myFarmIds(E, 'tok', fake(200, { not: 'a list' }).f)).rejects.toThrow('unreadable');
  });
  it('creates the farm with the PHONE\'s farm id and the typed name, through the one checked function', async () => {
    const ok = fake(200, 'farm-1');
    await createFirstFarm(E, 'tok', 'farm-1', '  Bora\'s farm ', ok.f);
    expect(ok.calls[0]!.url).toBe('https://x.example/rest/v1/rpc/create_first_farm');
    expect(JSON.parse(String(ok.calls[0]!.init.body))).toEqual({ p_farm: 'farm-1', p_name: 'Bora\'s farm' });
    expect(ok.calls[0]!.init.headers).toMatchObject({ authorization: 'Bearer tok' });
  });
  it('names WHY the server said no (one farm per person, already a member, open invitation, too many, unconfirmed e-mail), and anything else is «other»', async () => {
    const why = async (message: string) => { try { await createFirstFarm(E, 't', 'f', 'n', fake(400, { message }).f); return 'no error'; } catch (e) { return e instanceof FarmRefused ? e.reason : 'not a FarmRefused'; } };
    expect(await why('one farm per person: you have set up a farm before')).toBe('one_farm');
    expect(await why('you already belong to a farm')).toBe('member');
    expect(await why('you have an open invitation: accept it instead of setting up a farm')).toBe('invited');
    expect(await why('too many new farms in the last hour: try again later')).toBe('limit');
    expect(await why('confirm your e-mail address first')).toBe('confirm');
    expect(await why('a farm with this id already exists')).toBe('other');
    await expect(createFirstFarm(E, 't', 'f', 'n', fake(503, {}).f)).rejects.toThrow('HTTP 503');       // a server hiccup is not a refusal: the screen says «try again»
  });
});
