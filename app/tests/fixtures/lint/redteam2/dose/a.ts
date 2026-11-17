// @ts-nocheck-free file: red team 2, dose zone (defaults)
type Branded = number & { readonly __b: 'dose' };
type Dose = number;
declare const bd: Branded | undefined;
declare const x: number | undefined;
declare const nn: number | null;
declare const sv: string;
declare const s2: string | undefined;
declare const o: { phi?: number; dose?: number; legacy?: number };
declare const anyv: any;
declare const unk: unknown;
declare const rec: Record<string, number>;
declare const m: Map<string, number>;
declare const p: Promise<number | undefined>;
declare const list: { dose?: number }[];
declare const DEFAULTS: { phi: number; dose: number };
declare function fail(msg: string): never;
declare function orElse<T>(a: T | undefined, d: T): T;
declare function sum(): number;
const zero = 0;
export const a1 = bd ?? (7 as Branded); // @red D05
export const a2 = bd ?? 0; // @red D05
export function a3<T extends number>(v: T | undefined, d: T) { return v ?? d; } // @red D05
export const a4 = orElse(o.dose, 7);  // @limit generic fallback helper: only the call site is shown
export const a5 = ({ dose = 0 as Branded }: { dose?: Branded }) => dose; // @red D05
export const a6 = ({ dose = 0 as any }: { dose?: number }) => dose; // @red D05
export const a7 = ({ dose = 0 as never }: { dose?: number }) => dose; // @red D05
export const a8 = anyv ?? (0 as any); // @red D05
export const a9 = Number(anyv ?? '0'); // @red D05
export const b1 = Number(s2 ?? '0'); // @red D05
export const b2 = Number(s2 || '0'); // @red D05
export const b3 = parseFloat(s2 ?? '7'); // @red D05
export const b4 = nn !== null ? nn : 0; // @red D05
export const b5 = Number(nn); // @red D05
export const b6 = +(nn as number | null); // @red D05
export const b7 = Number(sv); // @red D05
export const b8 = +sv; // @red D05
export const b9 = (e: { target: { value: string } }) => Number(e.target.value); // @red D05
export const c1 = (v?: number) => { if (v !== undefined) return v; return 0; }; // @red D05
export const c2 = (v?: number) => { if (v !== undefined) { return v; } else { return 0; } }; // @red D05
export const c3 = (v?: number) => (v === undefined || v === null ? 0 : v); // @red D05
export const c4 = (v?: number) => (v !== undefined && v > 0 ? v : 0); // @red D05
export const c5 = (v?: number) => (v !== undefined ? (v as number) : 0); // @red D05
export const c6 = (v?: number) => (v !== undefined ? Number(v) : 0); // @red D05
export const c7 = (v?: number) => (v === undefined ? 0 : v * 1); // @red D05
export const c8 = (q?: { dose?: number }) => (q?.dose !== undefined ? q.dose : 0); // @red D05
export const c9 = (v?: number) => { v === undefined && (v = 0); return v; }; // @red D05
export const d1 = (q: { dose?: number }) => { q.dose === undefined && (q.dose = 0); return q.dose; }; // @red D05
export const d2 = (q: { dose?: number }) => { if (q.dose === undefined) Object.assign(q, { dose: 0 }); return q.dose; }; // @red D05
export const d3 = (q: { dose?: number }) => { if (q.dose === undefined) Reflect.set(q, 'dose', 0); return q.dose; }; // @red D05
export const d4 = { ...{ phi: 7 }, ...o }; // @red D05
export const d5 = { ...DEFAULTS, ...o }; // @red D05
export const d6 = Object.assign({}, DEFAULTS, o); // @red D05
export const d7 = { ...Object.fromEntries([['phi', 7]]), ...o };  // @limit defaults built by a function call (Object.fromEntries)
export const d8 = { withdrawal: 7, ...o }; // @red D05
export const d9 = { get phi() { return 7; }, ...o }; // @red D05
export const e1 = (k: 'phi') => ({ [k]: 7, ...o }); // @red D05
export const e2 = { days: 7, ...o }; // @red D05
export const e3 = p.catch(() => 0); // @red D05
export const e4 = async () => (await p.catch(() => 0)); // @red D05
export const e5 = (q: { dose?: number }) => { let out: number | undefined; try { out = q.dose!.valueOf(); } catch { out = 0; } return out; }; // @red D05
export const e6 = (v?: number) => { switch (typeof v) { case 'undefined': return 0; default: return v; } }; // @red D05
export const e7 = (k: string) => (m.has(k) ? m.get(k) : 0); // @red D05
export const e8 = (k: string) => (k in rec ? rec[k] : 0); // @red D05
export const e9 = (k: string) => (Object.hasOwn(rec, k) ? rec[k] : 0); // @red D05
export const f1 = (v?: number) => { const d = v; return { value: d ?? 0 }; }; // @red D05
export class F2 { private _d?: number; get dose(): number { if (this._d) return this._d; return 0; } } // @red D05
export const f3 = (v: number | undefined) => (v === undefined ? zero : v); // @red D05
export const f4 = (v: number | undefined): number => { if (v === undefined) { fail('x'); } return v ?? 1; }; // @red D05
export const f5 = (j: string) => JSON.parse(j).dose ?? 0; // @red D05
export const f6 = (v: Dose | undefined) => v ?? sum(); // @red D05
export const f7 = (v: unknown) => v || 7; // @red D05
export const f8 = (v: string | number | undefined) => v ?? 0; // @red D05
export const f9 = (v: any) => { const { dose = 0 } = v; return dose; }; // @red D05
export const g1 = () => { for (const { dose = 0 } of list) { return dose; } return undefined; }; // @red D05
export const g2 = () => { try { return 1; } catch ({ code = 0 }) { return code; } }; // @red D05
export const g3 = (v?: number) => [v].map((q) => q ?? 0); // @red D05
export const g4 = (v?: number) => `${v ?? 0}`; // @red D05
export const g5 = (v?: number) => Math.max(v ?? 0, 0); // @red D05
export const g6 = (v: number) => Math.max(v, 0); // @ok
export const g7 = (v: number) => Math.min(Math.max(v, 0), 100); // @ok
export const g8 = (v: number | undefined) => v ?? null; // @ok
export const g9 = (v: number | undefined) => v ?? undefined; // @ok
export const h1 = (v: number | undefined) => v ?? '–'; // @ok
export const h2 = (v: number | undefined) => v ?? fail('dose missing'); // @ok
export const h3 = (v: number | undefined) => v ?? (() => { throw new Error('missing'); })(); // @ok
export const h4 = (v: number | undefined) => v || 'n/a'; // @ok
export const h5 = (items: number[]) => { if (!items.length) return 0; return items[0]; };  // @red D05
export const h6 = (c: Map<string, number>, k: string) => c.set(k, (c.get(k) ?? 0) + 1);  // @red D05
export const h7 = (r: { phi?: number; phiDays?: number }) => r.phi ?? r.phiDays;  // @red D05
export const h8 = (r: { qty: number }, n2: number) => ({ ...r, qty: n2 }); // @ok
export const h9 = (r: { a: number }, n2: number) => ({ ...r, max: n2, minWidth: 10 }); // @ok
export const i1 = (v: number | undefined) => v === undefined ? 'unknown' : String(v); // @ok
export const i2 = (xs: number[]) => xs.reduce((a, b) => a + b, 0); // @ok
export const i3 = (v: number | undefined) => { if (v === undefined) throw new Error('missing'); return v; }; // @ok
export const i4 = (v: number | undefined) => { if (v === undefined) return null; return v; }; // @ok
export const i5 = (v: number | undefined) => v === undefined ? undefined : v; // @ok
export default (v?: number) => v ?? 0; // @red D05
