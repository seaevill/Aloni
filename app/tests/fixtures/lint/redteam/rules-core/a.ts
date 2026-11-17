declare const iso: string;
declare const anyv: any;
const D = Date;  // @red K01
const { now } = Date; // @red K01
const P = performance; // @red K02
const g = globalThis as any;  // @red K02
export const a1 = () => Reflect.apply(Date.now, Date, []); // @red K01
export const a2 = () => D.now();  // @limit use of an alias; the alias declaration itself is red
export const a3 = () => now();  // @limit use of an alias; the alias declaration itself is red
export const a4 = () => new D();  // @limit use of an alias; the alias declaration itself is red
export const a5 = () => Date.UTC();  // @ok
export const a6 = () => new Intl.DateTimeFormat('el').format(); // @red K01
export const a7 = () => new Intl.DateTimeFormat('el').format(undefined); // @red K01
export const a8 = () => new Date(Date.parse(iso)); // @ok
export const a9 = () => g.Date.now(); // @red K01
export const b1 = () => g['Da' + 'te'].now();  // @limit computed non-literal property name on an any-typed receiver
export const b2 = () => queueMicrotask(() => undefined); // @red K02
export const b3 = () => new Date(NaN); // @ok
export const b4 = () => new Date(iso ? iso : undefined); // @red K01
export const b5 = () => new (Date as any)(); // @red K01
export const b6 = () => Date.prototype.constructor(); // @red K01
export const b7 = () => (Date as unknown as () => string)(); // @red K01
export const b8 = () => new Date(...[]); // @red K01
export const b9 = () => structuredClone(1); // @ok
export const c1 = () => Math.random(); // @red K03
export const c2 = () => Math['random'](); // @red R01
export const c3 = () => { const M = Math; return M.random(); }; // @red R02
export const c4 = () => globalThis.crypto.randomUUID(); // @red K03
export const c5 = () => self.crypto; // @red K02
export const c6 = () => new Uint8Array(4).map(() => 4);  // @red R06
export const c7 = () => Reflect.get(Math, 'random')(); // @red R02
export const c8 = () => (Math as any)['ran' + 'dom'](); // @red R02
export const c9 = () => anyv.constructor.constructor('return Date.now()')(); // @red K01
export const d1 = () => requestAnimationFrame; // @red K02
export const d2 = () => Atomics.wait; // @red K02
export const d3 = () => new Date().getTime(); // @red K01
export const d4 = () => new Date(Date.now()); // @red K01
export const d5 = () => Temporal.Now.instant(); // @red K01
declare const Temporal: any;
export const d6 = () => { const T = Temporal; return T.Now.instant(); };  // @limit Temporal is not a known global
export const d7 = () => setImmediate(() => undefined); // @red K02
export const d8 = () => (0, performance).now(); // @red K02
export const d9 = () => P.now();  // @limit use of an alias; the alias declaration itself is red
export const e1 = () => process['hrtime'](); // @red K02
export const e2 = () => { const pr = process; return pr.uptime(); }; // @red K02
export const e3 = () => new Date(iso).getTimezoneOffset(); // @red K01
export const e4 = () => Date.parse(iso); // @ok
export const e5 = () => new Date(iso, 0); // @ok
export const e6 = () => new Date(2026, 10, 17); // @ok
export const e7 = () => new Date(`${iso}T00:00:00Z`); // @ok
export const e8 = () => new Date(undefined!); // @red K01
export const e9 = () => new Date(<any>undefined); // @red K01
export const f1 = () => new Date(null as any); // @red K01
export const f2 = () => import('node:crypto'); // @red K03
export const f3 = () => require('crypto'); // @red K03
declare const require: any;
export const f4 = () => new Date((undefined)); // @red K01
export const f5 = () => new Date(anyv.nothing);  // @limit value undefined only at run time
export const f6 = () => Date.UTC(...[] as [number]); // @ok
export const f7 = () => new Date(new Date(iso)); // @ok
export const f8 = () => new Date().toISOString(); // @red K01
export const f9 = () => g.performance.now();  // @limit use of an alias of globalThis; the alias declaration is red
export const h1 = () => g.crypto.getRandomValues(new Uint8Array(1)); // @red K03
export const h2 = () => { const { random } = Math; return random(); }; // @red R02
export const h3 = () => { const c = globalThis; return c.setTimeout; }; // @red K02
export const h4 = () => Intl.DateTimeFormat().format(); // @red K01
export const h5 = () => Date.now.call(Date); // @red K01
export const h6 = () => ((Date as any).now)(); // @red K01
export const h7 = () => (Date as any)?.now(); // @red K01
export const h8 = () => Date?.now(); // @red K01
export const h9 = () => new Date(iso).toLocaleString(); // @red R04
