// Sign-in with Supabase Auth's REST API (GoTrue), e-mail code only: no password, no third-party login. Nothing here runs unless config.AUTH_ENABLED is true.
// The session (tokens) is kept on this phone only, in IndexedDB; it is never logged and never put in a URL.
import { signal } from '@preact/signals';

export interface Endpoint { url: string; apiKey: string }
export interface Session { access_token: string; refresh_token: string; expires_at: number; email: string; user_id: string }
type Fetch = typeof fetch;

const headers = (e: Endpoint, token?: string) => ({ 'content-type': 'application/json', apikey: e.apiKey, ...(token ? { authorization: `Bearer ${token}` } : {}) });
async function post(e: Endpoint, path: string, body: unknown, f: Fetch): Promise<Record<string, unknown>> {
  const res = await f(`${e.url}/auth/v1/${path}`, { method: 'POST', headers: headers(e), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`sign-in: HTTP ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

/** Asks for a one-time code to be e-mailed. A new address is created (an account without a farm membership sees no data: row-level security). */
export async function requestCode(e: Endpoint, email: string, f: Fetch = fetch): Promise<void> {
  await post(e, 'otp', { email: email.trim().toLowerCase(), create_user: true }, f);
}

const toSession = (r: Record<string, unknown>, now: number): Session => {
  const user = r.user as { id?: unknown; email?: unknown } | undefined;
  if (typeof r.access_token !== 'string' || typeof r.refresh_token !== 'string' || typeof r.expires_in !== 'number' || typeof user?.id !== 'string' || typeof user.email !== 'string') throw new Error('sign-in: unreadable answer');
  return { access_token: r.access_token, refresh_token: r.refresh_token, expires_at: now + r.expires_in * 1000, email: user.email, user_id: user.id };
};

/** The code from the e-mail → a session. */
export async function verifyCode(e: Endpoint, email: string, code: string, now: number, f: Fetch = fetch): Promise<Session> {
  return toSession(await post(e, 'verify', { type: 'email', email: email.trim().toLowerCase(), token: code.trim() }, f), now);
}

/** A fresh token from the refresh token (they are single-use: the answer carries the next one). */
export async function refreshSession(e: Endpoint, s: Session, now: number, f: Fetch = fetch): Promise<Session> {
  const res = await f(`${e.url}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: headers(e), body: JSON.stringify({ refresh_token: s.refresh_token }) });
  if (!res.ok) throw new RefreshRefused(res.status);
  return toSession((await res.json()) as Record<string, unknown>, now);
}

/** The auth server answered, and the answer was no. Only 400/401 prove the refresh token is dead (403 is also what a proxy or captive portal answers, so it proves nothing); a 5xx, 429 or a lost connection proves nothing either. */
export class RefreshRefused extends Error {
  constructor(readonly status: number) { super(`sign-in: HTTP ${status}`); }
  get dead(): boolean { return this.status === 400 || this.status === 401; }
}

/** The token to use now: the stored one while it has more than a minute left, else a refreshed one (stored again). undefined = not signed in. */
export const MIN_LEFT_MS = 60_000;
const inFlight = new Map<string, Promise<string | undefined>>();   // one refresh per single-use refresh token: concurrent callers share it (the loser would get «already used» and sign the worker out)
export async function tokenFor(e: Endpoint, s: Session | undefined, now: number, save: (s: Session | undefined) => Promise<void>, f: Fetch = fetch): Promise<string | undefined> {
  if (!s) return undefined;
  if (s.expires_at - now > MIN_LEFT_MS) return s.access_token;
  const running = inFlight.get(s.refresh_token);
  if (running) return running;
  const job = (async () => {
    try { const next = await refreshSession(e, s, now, f); await save(next); return next.access_token; }
    catch (err) { if (err instanceof RefreshRefused && err.dead) await save(undefined); return undefined; }   // a flaky field connection must not sign the worker out: only the auth server's «no» does
  })();
  inFlight.set(s.refresh_token, job);
  try { return await job; } finally { inFlight.delete(s.refresh_token); }
}

/** After a sign-in: claims any open invitation for this address (a worker's first sign-in). «No invitation» is normal for an owner and is not an error. */
export async function claimInvitations(e: Endpoint, token: string, f: Fetch = fetch): Promise<string[]> {
  const res = await f(`${e.url}/rest/v1/rpc/accept_invitation`, { method: 'POST', headers: headers(e, token), body: '{}' });
  if (!res.ok) return [];
  const r = (await res.json()) as { farms?: unknown };
  return Array.isArray(r.farms) ? r.farms.filter((x): x is string => typeof x === 'string') : [];
}

/** The owner's invitation for one e-mail address (and the roster worker it is for). The server refuses it until the data controller's details are entered. */
export async function invite(e: Endpoint, token: string, farmId: string, email: string, workerId: string | undefined, f: Fetch = fetch): Promise<void> {
  const res = await f(`${e.url}/rest/v1/invitations`, { method: 'POST', headers: { ...headers(e, token), prefer: 'return=minimal' }, body: JSON.stringify({ farm_id: farmId, email: email.trim().toLowerCase(), ...(workerId ? { worker_id: workerId } : {}) }) });
  if (!res.ok) throw new Error(`invite: HTTP ${res.status}`);
}

export interface OpenInvitation { id: string; email: string; worker_id: string | null }
/** The invitations of this farm that nobody has used yet (the owner sees them; nobody else can). A failure or an unreadable answer is an empty list. */
export async function openInvitations(e: Endpoint, token: string, farmId: string, f: Fetch = fetch): Promise<OpenInvitation[]> {
  try {
    const res = await f(`${e.url}/rest/v1/invitations?farm_id=eq.${encodeURIComponent(farmId)}&accepted_at=is.null&select=id,email,worker_id`, { method: 'GET', headers: headers(e, token) });
    if (!res.ok) return [];
    const rows = (await res.json()) as unknown;
    return Array.isArray(rows) ? rows.filter((r): r is OpenInvitation => typeof r?.id === 'string' && typeof r.email === 'string') : [];
  } catch { return []; }
}

/** The owner takes an unused invitation back (an expired one is replaced by a new invitation by itself). */
export async function withdrawInvitation(e: Endpoint, token: string, id: string, f: Fetch = fetch): Promise<void> {
  const res = await f(`${e.url}/rest/v1/invitations?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: headers(e, token) });
  if (!res.ok) throw new Error(`withdraw: HTTP ${res.status}`);
}

export const session = signal<Session | undefined>(undefined);
