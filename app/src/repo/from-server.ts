// The ONE place where a row the server hands out (pull = to_jsonb of the table row) becomes a row in the phone's own shape. Pure: no database, no clock.
// Without it a pulled row replaced the phone's own copy in the SERVER's shape: a signed label read «blocked», waiting periods read «unknown», and every
// correction of a pulled spray was refused (chain_no). The reverse of this (phone → server) is normalize_label_row / apply_one in supabase/migrations/0012.

/** Columns the server sets itself; apply_one refuses a row that carries any of them (0012 `server_owned`). Stripped from every pulled row. */
export const SERVER_OWNED = ['server_seq', 'sync_xid', 'hash', 'prev_hash', 'chain_no', 'created_by', 'received_at', 'assigned_to', 'done_by'] as const;
/** Server-made columns of single tables that are not part of the phone's record (generated or computed by the server). */
const SERVER_ONLY_OF: Readonly<Record<string, readonly string[]>> = { stock_movements: ['qty'], plantings: ['area_m2'] };

/** The label values that can be «not on the label»: the phone keeps the text 'not_on_label', the server a flag column beside an empty value. */
const LABEL_VALUES = ['dose_min', 'dose_max', 'phi_days', 'rei_hours', 'max_apps'] as const;
/** The phone keeps these as decimal TEXT (a typed number is never rounded); the server returns numbers. */
const TEXT_NUMBERS = new Set<string>([...LABEL_VALUES, 'water_l', 'ph', 'ec']);
const isTextNumber = (k: string): boolean => TEXT_NUMBERS.has(k) || k.endsWith('_str') || k.endsWith('_str_treated');

/** A number as exact decimal text, never in exponent form; undefined when it has no honest text form (then the value is simply unknown). */
export function decimalText(n: number): string | undefined {
  if (!Number.isFinite(n)) return undefined;
  const s = String(n);
  if (!/e/i.test(s)) return s;
  if (Math.abs(n) >= 1e21) return undefined;
  const m = /^(-?)(\d)(?:\.(\d+))?e-(\d+)$/i.exec(s);   // only small numbers print with an exponent below 1e21: 1.5e-7 = 0.00000015
  if (!m) return undefined;
  let zeros = '';
  for (let i = 1n; i < BigInt(m[4]!); i++) zeros += '0';
  return `${m[1]}0.${zeros}${m[2]}${m[3] ?? ''}`;
}

/** Timestamp columns (created_at, sprayed_at, phi_until ...): the only ones read as instants. */
const isStamp = (k: string): boolean => k.endsWith('_at') || k.endsWith('_until');
const INSTANT = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}(?::?\d{2})?)$/;
/**
 * A server timestamp (`2026-11-20T14:54:03.218993+00:00`) as `YYYY-MM-DDTHH:MM:SSZ`, the only form the rules read. Anything after the whole second ROUNDS UP,
 * never down: a waiting period must never end earlier than the server says. Not a timestamp (a date, a name): returned as it is.
 */
export function canonicalInstant(v: string): string {
  const m = INSTANT.exec(v);
  if (!m) return v;
  const zone = m[4] === 'Z' ? 'Z' : m[4]!.length === 3 ? `${m[4]}:00` : m[4]!.includes(':') ? m[4]! : `${m[4]!.slice(0, 3)}:${m[4]!.slice(3)}`;
  const base = Date.parse(`${m[1]}T${m[2]}${zone}`);
  if (Number.isNaN(base)) return v;
  const up = m[3] !== undefined && /[1-9]/.test(m[3]) ? 1000 : 0;
  return `${new Date(base + up).toISOString().slice(0, 19)}Z`;
}

export interface PhoneRow { table: string; row: Record<string, unknown> }

/** One pulled row in the phone's shape. `farm_settings` becomes the phone's `settings` ({key, value}). */
export function fromServer(table: string, row: Record<string, unknown>): PhoneRow {
  if (table === 'farm_settings') return { table: 'settings', row: { key: row.key, value: row.value } };
  const out: Record<string, unknown> = { ...row };
  for (const k of [...SERVER_OWNED, ...(SERVER_ONLY_OF[table] ?? [])]) delete out[k];
  if (table === 'label_uses') labelFromServer(out);
  for (const [k, v] of Object.entries(out)) {
    if (typeof v === 'number' && isTextNumber(k)) { const t = decimalText(v); if (t === undefined) delete out[k]; else out[k] = t; }
    else if (typeof v === 'string' && isStamp(k)) out[k] = canonicalInstant(v);
  }
  return { table, row: out };
}

/** The server's sign-off columns and «not on label» flags back into the phone's `sign_off` object and 'not_on_label' text. A partial signature is no signature. */
function labelFromServer(r: Record<string, unknown>): void {
  const by = r.sign_off_by; const on = r.sign_off_on; const fp = r.sign_off_fingerprint;
  for (const k of ['sign_off_by', 'sign_off_on', 'sign_off_fingerprint']) delete r[k];
  if (typeof by === 'string' && typeof on === 'string' && typeof fp === 'string') r.sign_off = { by, on, fingerprint: fp }; else delete r.sign_off;
  for (const k of LABEL_VALUES) {
    const flag = r[`${k}_not_on_label`];
    delete r[`${k}_not_on_label`];
    if (flag === true) r[k] = 'not_on_label'; else if (r[k] === null) delete r[k];
  }
}
