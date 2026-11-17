// Fixture: K01-K03 (rules-core is pure: no clock, no randomness).
import { randomUUID } from 'node:crypto'; // @red K03
export const a = () => Date.now(); // @red K01
export const b = () => new Date(); // @red K01
export const c = () => Date(); // @red K01
export const d = () => globalThis.Date.now(); // @red K01
export const e = () => Date['now'](); // @red K01
export const f = () => new Date(...([] as string[])); // @red K01
export const g = () => new Date(undefined as unknown as string); // @red K01
export const h = () => { const D = Date; return D.now(); }; // @red K01
export const i = () => new globalThis.Date(); // @red K01
export const j = () => performance.now(); // @red K02
export const k = () => setTimeout(() => undefined, 1); // @red K02
export const l = () => process.hrtime(); // @red K02
export const m = () => Math.random(); // @red K03
export const n = () => crypto.randomUUID(); // @red K03
export const o = () => globalThis.crypto.getRandomValues(new Uint8Array(1)); // @red K03
export const p = () => randomUUID();
// legitimate code must stay green:
export const ok1 = (iso: string) => new Date(iso); // @ok
export const ok2 = (iso: string) => new Date(iso).getTime(); // @ok
export const ok3 = (a: number, b: number) => Math.max(a, b); // @ok
export const ok4 = (iso: string) => Date.parse(iso); // @ok
export const q = (x?: string) => new Date(x as string); // @red K01
export const r = (x?: string) => new Date(x ?? undefined); // @red K01
export const s = () => new Date(void 0 as unknown as string); // @red K01
