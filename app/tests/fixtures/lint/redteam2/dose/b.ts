import { round } from 'lodash'; // @red R08
import Big from 'big.js'; // @red R08
declare const v: number;
declare const s: string;
declare const dv: DataView;  // @red R09
declare const rt: Intl.RelativeTimeFormat;  // @red R05
export const a1 = Math.f16round(v); // @red R01
export const a2 = +String(v).slice(0, 4); // @red R06
export const a3 = Number.parseFloat(String(v).slice(0, 4)); // @red R06
export const a4 = new Number(String(v).slice(0, 4)); // @red R06
export const a5 = JSON.parse(String(v).slice(0, 4)); // @red R06
export const a6 = Number(String(v).replace(/(\.\d)\d+/, '$1')); // @red R06
export const a7 = Number(String(v).match(/^\d+\.\d/)![0]); // @red R06
export const a8 = (() => { const t = String(v).slice(0, 4); return Number(t); })(); // @red R06
export const a9 = (() => { const parts = String(v).split('.'); return parseFloat(parts[0]); })(); // @red R06
export const b1 = v & -1; // @red R06
export const b2 = v & 0xffffffff; // @red R06
export const b3 = (() => { let q = v; q &= -1; return q; })(); // @red R06
export const b4 = v | zero(); // @red R06
export const b5 = v >> zero(); // @red R06
export const b6 = Float32Array.of(v)[0]; // @red R09
export const b7 = Float32Array.from([v])[0]; // @red R09
export const b8 = Int32Array.of(v)[0]; // @red R09
export const b9 = (() => { dv.setFloat32(0, v); return dv.getFloat32(0); })(); // @red R06
export const c1 = rt.format(v, 'day');  // @limit method call on an Intl instance obtained elsewhere
export const c2 = new Intl.RelativeTimeFormat('el').format(v, 'day'); // @red R05
export const c3 = new Date(v).getTime();  // @limit fractional milliseconds
export const c4 = Reflect.get(Number.prototype, 'toFixed');  // @limit reflective property access by string
export const c5 = (el: HTMLElement) => { el.style.width = `${v}px`; }; // @ok
export const c6 = new Intl.PluralRules('el').select(v); // @ok
export const c7 = BigInt(v); // @ok
export const c8 = v * 100 / 100; // @ok
export const c9 = v.toString(2); // @ok
export const d1 = Math.sign(v); // @ok
export const d2 = String(v).padStart(8, ' '); // @ok
export const d3 = structuredClone({ v }); // @ok
export const d4 = JSON.parse(JSON.stringify({ v })); // @ok
export const d5 = Math.max(v, 0) + Math.min(v, 1) + Math.abs(v); // @ok
export const d6 = Number.parseFloat(s); // @ok
export const d7 = (i: number, n: number[]) => n[i % n.length];  // @red R06
export const d8 = (flags: number) => flags | (1 << 3);  // @red R06
export const d9 = (xs: number[]) => xs.sort((a, b) => a - b); // @ok
export const e1 = (x: number) => x - (x % 1e0); // @red R06
export const e2 = (alerts: { id: number }[]) => alerts.map((alert) => alert.id); // @ok
export const e3 = (alert: { severity: number }) => alert.severity; // @ok
export const e4 = ({ prompt }: { prompt: string }) => prompt; // @ok
declare function zero(): number;
