// The real Transport: Supabase's REST endpoints (PostgREST RPC) with the user's own session token. Built only when a project URL and an account exist.
import type { ServerAnswer } from '../repo/sync-apply';
import type { PullAnswer, Transport } from './engine';

export interface Endpoint { url: string; apiKey: string; token: () => Promise<string> }

export function httpTransport(e: Endpoint, fetcher: typeof fetch = fetch): Transport {
  const call = async (fn: string, body: unknown): Promise<unknown> => {
    const res = await fetcher(`${e.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: e.apiKey, authorization: `Bearer ${await e.token()}` }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`${fn}: HTTP ${res.status}`);
    return res.json();
  };
  return {
    async rpc(name, args) {
      const res = await fetcher(`${e.url}/rest/v1/rpc/${name}`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: e.apiKey, authorization: `Bearer ${await e.token()}` }, body: JSON.stringify(args) });
      if (res.ok) return { ok: true };
      if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) { const b = (await res.json().catch(() => ({}))) as { code?: string; message?: string }; return { ok: false, code: b.code ?? String(res.status), reason: b.message ?? `HTTP ${res.status}` }; }
      throw new Error(`${name}: HTTP ${res.status}`);
    },
    async weather(farmId) { return (await call('farm_weather', { p_farm: farmId })) as Array<{ parcel_id: string; days: unknown[] }>; },
    async applyOps(ops) { return (await call('apply_ops', { p_ops: ops })) as Array<ServerAnswer & { op_id: string }>; },
    async pull(farmId, cursor, limit) {
      const r = (await call('pull', { p_farm: farmId, p_cursor: cursor, p_limit: limit })) as { rows: Array<{ table: string; x: string; seq: number; row: PullAnswer['rows'][number]['row'] }>; more: boolean; reset: boolean; cursor: unknown };
      return { rows: r.rows, more: r.more, reset: r.reset, cursor: r.cursor };
    },
  };
}

/** Photos: Supabase Storage, bucket `photos`, path `<farm>/<photo id>`; the bytes exactly as stored. (The bucket and its policy are created by a migration that is NOT written yet: until then a photo upload is refused and reported.) */
export function httpMediaPut(e: Endpoint, farmId: string, fetcher: typeof fetch = fetch): (m: { id: string; mime: string; bytes: ArrayBuffer }) => Promise<void> {
  return async (m) => {
    const res = await fetcher(`${e.url}/storage/v1/object/photos/${farmId}/${m.id}`, { method: 'POST', headers: { 'content-type': m.mime, apikey: e.apiKey, authorization: `Bearer ${await e.token()}`, 'x-upsert': 'false' }, body: m.bytes });
    if (!res.ok && res.status !== 409) throw new Error(`photo ${m.id}: HTTP ${res.status}`);   // 409 = already there (an earlier, interrupted upload)
  };
}
