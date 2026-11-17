// Fixture: R01-R07. A line tagged red (with its ban id) MUST be flagged with that id; a line tagged ok must NOT be flagged.
export const a = (x: number) => Math.round(x); // @red R01
export const b = (x: number) => Math.floor(x); // @red R01
export const c = (x: number) => Math.ceil(x); // @red R01
export const d = (x: number) => Math.trunc(x); // @red R01
export const e = (x: number) => Math['round'](x); // @red R01
export const f = (x: number) => Math[`floor`](x); // @red R01
export const g = (x: number) => globalThis.Math.round(x); // @red R01
export const h = (x: number) => (window as unknown as { Math: Math }).Math.ceil(x); // @red R01
export const i = Math.round; // @red R01
const { round } = Math; // @red R02
export const j = (x: number) => round(x);
const M = Math; // @red R02
export const k = (x: number) => M.max(x, 1);
export const l = (x: number) => x.toFixed(2); // @red R03
export const m = (x: number) => x.toPrecision(3); // @red R03
export const n = (x: number) => x.toExponential(2); // @red R03
export const o = (x: number) => x['toFixed'](1); // @red R03
export const p = (x: number) => x.toLocaleString(); // @red R04
export const q = (x: number) => x['toLocaleString']('el'); // @red R03
export const r = (x: number) => new Intl.NumberFormat('el').format(x); // @red R05
export const s = (x: number) => Intl['NumberFormat']('el').format(x); // @red R05
const { NumberFormat } = Intl; // @red R05
export const t = (x: number) => new NumberFormat('el').format(x); // @red R05
export const u = (x: number) => x | 0; // @red R06
export const v = (x: number) => x >> 0; // @red R06
export const w = (x: number) => x >>> 0; // @red R06
export const y = (x: number) => ~~x; // @red R06
export const z = (x: number) => x - (x % 1); // @red R06
export const aa = (x: string) => parseInt(x, 10); // @red R06
export const ab = (x: string) => Number.parseInt(x, 10); // @red R06
export const ac = (x: number) => 0 | x; // @red R06
export const ad = (x: number) => x | 0.5; // @red R06
export const ae = (x: string) => eval(x); // @red R07
export const af = (x: string) => new Function(x)(); // @red R07
export const ag = (x: number) => (globalThis as Record<string, any>)['Math'].round(x); // @red R07
// legitimate code must stay green:
export const ok1 = (x: number, y: number) => Math.max(x, y); // @ok
export const ok2 = (a: number, b: number) => Math.min(a, b) + Math.abs(a); // @ok
export const ok3 = (iso: string) => new Intl.DateTimeFormat('el-GR').format(new Date(iso)); // @ok
export const ok4 = (flags: number) => flags & 0xff; // @ok
export const ok5 = (list: number[]) => list.length % 2; // @ok
export const ok6 = (x: number) => String(x).replace('.', ','); // @ok
