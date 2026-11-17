// Fixture: D01-D04 (a missing label value must never get a default).
declare const x: number | undefined;
declare const o: { phi?: number };
const DEFAULT_PHI = 7;
const DEFAULTS = { phi: 7 };
const defaultDose = 0.5;
export const a = x ?? 0; // @red D05
export const b = x || 1; // @red D05
export const c = x ?? -1; // @red D05
export const d = x ?? +1; // @red D05
export const e = x ?? DEFAULT_PHI; // @red D05
export const f = x ?? DEFAULTS.phi; // @red D05
export const g = x ?? defaultDose; // @red D05
export const h = x ?? Number.MAX_SAFE_INTEGER; // @red D05
export const i = x ?? Infinity; // @red D05
export const j = x ?? NaN; // @red D05
export const k = x ?? Number('7'); // @red D05
export const l = x ?? 0x10; // @red D05
export const m = o.phi ?? 0.5; // @red D05
export const fn1 = ({ phi = 7 }: { phi?: number }) => phi; // @red D05
export const fn2 = (dose = 0.5) => dose; // @red D05
export const fn3 = (dose = -1) => dose; // @red D05
export const fn4 = (dose = DEFAULT_PHI) => dose; // @red D05
export const fn5 = ([rei = 24]: number[]) => rei; // @red D05
export const fn6 = ({ phi = DEFAULTS.phi }: { phi?: number }) => phi; // @red D05
let y: number | undefined;
y ??= 7; // @red D05
y ||= 7; // @red D05
y ??= -1; // @red D05
y ??= DEFAULT_PHI; // @red D05
export const t1 = x == null ? 0 : x; // @red D05
export const t2 = x === undefined ? 7 : x; // @red D05
export const t3 = x != null ? x : 0; // @red D05
export const t4 = null === x ? -1 : x; // @red D05
export const t5 = undefined !== x ? x : 3; // @red D05
export { y };
// legitimate code must stay green:
export const ok1 = (s: string | undefined) => s ?? 'unknown'; // @ok
export const ok2 = (a: number | undefined, b: number) => a ?? b; // @red D05 (any numeric fallback, even another variable)
export const ok3 = (flag: boolean) => (flag ? 1 : 0); // @ok
export const ok4 = (list: number[] | undefined) => list ?? []; // @ok
export const ok5 = (n: number) => (n === 1 ? 'one' : 'other'); // @ok
export const ok6 = (rows: unknown[] | null) => (rows ? rows.length : 0); // @ok
export const ok7 = (a: boolean, b: boolean) => a || b; // @ok
