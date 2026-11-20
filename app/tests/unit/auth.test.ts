import { describe, expect, it } from 'vitest';
import { claimInvitations, invite, MIN_LEFT_MS, refreshSession, requestCode, tokenFor, verifyCode, type Session } from '../../src/auth/gotrue';

const E = { url: 'https://x.example', apiKey: 'pub' };
type Call = { url: string; init: RequestInit };
const fake = (answer: unknown, ok = true) => { const calls: Call[] = []; const f = (async (url: string, init: RequestInit) => { calls.push({ url, init }); return { ok, status: ok ? 200 : 401, json: async () => answer }; }) as unknown as typeof fetch; return { f, calls }; };
const body = (c: Call) => JSON.parse(String(c.init.body)) as Record<string, unknown>;
const grant = { access_token: 'a1', refresh_token: 'r1', expires_in: 3600, user: { id: 'u1', email: 'bora@example.org' } };
const sess: Session = { access_token: 'a0', refresh_token: 'r0', expires_at: 10_000_000, email: 'bora@example.org', user_id: 'u1' };

describe('e-mail code sign-in', () => {
  it('asks for a code with a lower-cased, trimmed address, and nothing else', async () => {
    const { f, calls } = fake({});
    await requestCode(E, '  Bora@Example.org ', f);
    expect(calls[0]!.url).toBe('https://x.example/auth/v1/otp');
    expect(body(calls[0]!)).toEqual({ email: 'bora@example.org', create_user: true });
    expect(calls[0]!.init.headers).toMatchObject({ apikey: 'pub' });
    expect(JSON.stringify(calls[0]!.init.headers)).not.toContain('authorization');
  });

  it('turns the code into a session with an absolute expiry; an unreadable or refused answer is an error', async () => {
    const ok = fake(grant);
    expect(await verifyCode(E, 'Bora@Example.org', ' 123456 ', 1_000_000, ok.f)).toEqual({ access_token: 'a1', refresh_token: 'r1', expires_at: 1_000_000 + 3_600_000, email: 'bora@example.org', user_id: 'u1' });
    expect(body(ok.calls[0]!)).toEqual({ type: 'email', email: 'bora@example.org', token: '123456' });
    await expect(verifyCode(E, 'a@b.co', '1', 0, fake({ access_token: 'x' }).f)).rejects.toThrow('unreadable');
    await expect(verifyCode(E, 'a@b.co', '1', 0, fake({}, false).f)).rejects.toThrow('HTTP 401');
  });

  it('keeps the stored token while it has more than a minute left, else refreshes and stores the next one; a failed refresh signs out', async () => {
    const saved: Array<Session | undefined> = [];
    const save = async (s: Session | undefined) => { saved.push(s); };
    const live = fake(grant);
    expect(await tokenFor(E, sess, sess.expires_at - MIN_LEFT_MS - 1, save, live.f)).toBe('a0');
    expect(live.calls).toHaveLength(0);
    const r = fake(grant);
    expect(await tokenFor(E, sess, sess.expires_at - 1000, save, r.f)).toBe('a1');
    expect(r.calls[0]!.url).toBe('https://x.example/auth/v1/token?grant_type=refresh_token');
    expect(body(r.calls[0]!)).toEqual({ refresh_token: 'r0' });
    expect(saved[0]?.access_token).toBe('a1');
    expect(await tokenFor(E, sess, sess.expires_at, save, fake({}, false).f)).toBeUndefined();
    expect(saved[1]).toBeUndefined();
    // a flaky connection or a server hiccup must NOT sign the worker out (refresh tokens are single-use, but only a refusal from the auth server proves this one is dead)
    const kept: Array<Session | undefined> = [];
    const keep = async (x: Session | undefined) => { kept.push(x); };
    const boom = (async () => { throw new TypeError('network'); }) as unknown as typeof fetch;
    const f503 = (async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as typeof fetch;
    expect(await tokenFor(E, sess, sess.expires_at, keep, boom)).toBeUndefined();
    expect(await tokenFor(E, sess, sess.expires_at, keep, f503)).toBeUndefined();
    const st = (status: number) => (async () => ({ ok: false, status, json: async () => ({}) })) as unknown as typeof fetch;
    for (const status of [403, 429, 500]) expect(await tokenFor(E, sess, sess.expires_at, keep, st(status))).toBeUndefined();
    expect(kept).toEqual([]);                                                // nothing was stored: the session is still there for the next try
    for (const status of [400, 401]) { const gone: Array<Session | undefined> = []; await tokenFor(E, sess, sess.expires_at, async (x) => { gone.push(x); }, st(status)); expect(gone).toEqual([undefined]); }   // only the auth server's «no» signs out
    // two callers at once share ONE refresh (the refresh token is single-use)
    const once = fake(grant); const [a, b] = await Promise.all([tokenFor(E, sess, sess.expires_at, save, once.f), tokenFor(E, sess, sess.expires_at, save, once.f)]);
    expect(once.calls).toHaveLength(1); expect(a).toBe('a1'); expect(b).toBe('a1');
    expect(await tokenFor(E, undefined, 0, save)).toBeUndefined();
    await expect(refreshSession(E, sess, 0, fake({}, false).f)).rejects.toThrow('HTTP 401');
  });
});

describe('invitations from the app', () => {
  it('claims open invitations with the user\'s token; none (or an error) is normal for an owner', async () => {
    const a = fake({ farms: ['f1', 'f2'] });
    expect(await claimInvitations(E, 'tok', a.f)).toEqual(['f1', 'f2']);
    expect(a.calls[0]!.url).toBe('https://x.example/rest/v1/rpc/accept_invitation');
    expect(a.calls[0]!.init.headers).toMatchObject({ authorization: 'Bearer tok' });
    expect(await claimInvitations(E, 'tok', fake({}, false).f)).toEqual([]);
  });

  it('the owner\'s invitation carries the farm, the lower-cased address and the roster worker; a refusal is an error', async () => {
    const a = fake({});
    await invite(E, 'tok', 'f1', ' Worker@Example.org', 'w1', a.f);
    expect(a.calls[0]!.url).toBe('https://x.example/rest/v1/invitations');
    expect(body(a.calls[0]!)).toEqual({ farm_id: 'f1', email: 'worker@example.org', worker_id: 'w1' });
    const b = fake({}); await invite(E, 'tok', 'f1', 'w@example.org', undefined, b.f);
    expect(body(b.calls[0]!)).toEqual({ farm_id: 'f1', email: 'w@example.org' });
    await expect(invite(E, 'tok', 'f1', 'w@example.org', undefined, fake({}, false).f)).rejects.toThrow('HTTP 401');
  });
});

describe('withdrawing an invitation', () => {
  it('lists the open invitations of the farm (a failure is an empty list) and deletes one by id', async () => {
    const a = fake([{ id: 'i1', email: 'w@example.org', worker_id: 'w1' }, { nope: 1 }]);
    const { openInvitations, withdrawInvitation } = await import('../../src/auth/gotrue');
    expect(await openInvitations(E, 'tok', 'f1', a.f)).toEqual([{ id: 'i1', email: 'w@example.org', worker_id: 'w1' }]);
    expect(a.calls[0]!.url).toBe('https://x.example/rest/v1/invitations?farm_id=eq.f1&accepted_at=is.null&select=id,email,worker_id');
    expect(await openInvitations(E, 'tok', 'f1', fake({}, false).f)).toEqual([]);
    const d = fake({}); await withdrawInvitation(E, 'tok', 'i1', d.f);
    expect(d.calls[0]).toMatchObject({ url: 'https://x.example/rest/v1/invitations?id=eq.i1', init: { method: 'DELETE' } });
    await expect(withdrawInvitation(E, 'tok', 'i1', fake({}, false).f)).rejects.toThrow('HTTP 401');
  });
});
