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
    async applyOps(ops) { return (await call('apply_ops', { p_ops: ops })) as Array<ServerAnswer & { op_id: string }>; },
    async pull(farmId, cursor, limit) {
      const r = (await call('pull', { p_farm: farmId, p_cursor: cursor, p_limit: limit })) as { rows: Array<{ table: string; x: string; seq: number; row: PullAnswer['rows'][number]['row'] }>; more: boolean; reset: boolean; cursor: unknown };
      return { rows: r.rows, more: r.more, reset: r.reset, cursor: r.cursor };
    },
  };
}
