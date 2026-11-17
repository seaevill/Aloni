declare const x: number | undefined;
declare const o: { phi?: number; dose?: number };
declare const arr: number[];
declare const m: Map<string, number>;
declare const s: string | undefined;
declare const n: number;
enum E { PHI = 7 }
const seven = 7;
const cfg = { phi: 7 } as const;
const helper = () => 7;
export const a1 = x ?? seven; // @red D05
export const a2 = x ?? E.PHI; // @red D05
export const a3 = x ?? cfg.phi; // @red D05
export const a4 = x ?? helper(); // @red D05
export const a5 = x ?? (0 as number); // @red D05
export const a6 = x ?? (0); // @red D05
export const a7 = x ?? 0 satisfies number; // @red D05
export const a8 = x ?? (n, 0); // @red D05
export const a9 = x !== undefined ? x : 0; // @red D05
export const b1 = typeof x === 'undefined' ? 0 : x; // @red D05
export const b2 = Number.isFinite(x) ? x : 0; // @red D05
export const b3 = x ? x : 0; // @red D05
export const b4 = Object.assign({ phi: 7 }, o).phi; // @red D05
export const b5 = { phi: 7, ...o }.phi; // @red D05
export const b6 = m.get('a') ?? seven; // @red D05
export const b7 = arr[0] ?? 0; // @red D05
export const b8 = arr.find((v) => v > 1) ?? 0; // @red D05
export const b9 = arr.reduce((p, c) => p + c, 0); // @ok
export const c5 = JSON.parse(JSON.stringify({ a: x ?? 0 })); // @red D05
export function f1(dose: number = 0): number { return dose; } // @red D05
export function f2(dose?: number) { if (dose === undefined) dose = 0; return dose; } // @red D05
export function f3(dose?: number) { if (dose == null) { return 0; } return dose; } // @red D05
export function f4(o2: { dose?: number }) { return 'dose' in o2 ? o2.dose : 0; } // @red D05
export const f5 = (o2: { dose?: number }) => o2.dose ?? Number.NaN; // @red D05
export const f6 = (o2: { dose?: number }) => o2.dose ?? Math.PI; // @red D05
export const f7 = (o2: { dose?: number }) => o2.dose ?? Number.EPSILON; // @red D05
export const f8 = (o2: { dose?: number }) => o2.dose ?? parseFloat('1'); // @red D05
export const f9 = (o2: { dose?: number }) => o2.dose ?? (1 + 1); // @red D05
export const g1 = (o2: { dose?: number }) => o2.dose ?? 1 + 1; // @red D05
export const g2 = (o2: { dose?: number }) => o2.dose ?? [0][0]; // @red D05
export const g3 = (o2: { dose?: number }) => o2.dose ?? ({ v: 0 }).v; // @red D05
export const g4 = (o2: { dose?: number }) => o2.dose ?? `${0}`;  // @limit text/number mix hidden in a template literal
export const g5 = (o2: { dose?: number }) => (o2.dose === undefined ? helper() : o2.dose); // @red D05
export const g6 = (o2: { dose?: number }) => { const { dose = seven } = o2; return dose; }; // @red D05
export const g7 = (o2: { dose?: number }) => { const { dose = (0) } = o2; return dose; }; // @red D05
export const g8 = (o2: { dose?: number }) => { const { dose = 1 + 1 } = o2; return dose; }; // @red D05
export const g9 = (o2: { dose?: number }) => { const { dose = 0 as number } = o2; return dose; }; // @red D05
export const h1 = (o2: { dose?: number }) => { let d = o2.dose; d = d ?? 0; return d; }; // @red D05
export const h2 = (o2: { dose?: number }) => { let d = o2.dose; d ||= (0); return d; }; // @red D05
export const h3 = (o2: { dose?: number }) => { let d = o2.dose; d ??= 1 + 1; return d; }; // @red D05
export const h4 = (o2: { dose?: number }) => o2.dose ?? Number.MIN_VALUE; // @red D05
export const h5 = (o2: { dose?: number }) => Math.max(o2.dose ?? NaN, 0); // @red D05
export const h7 = (o2: { dose?: number }) => [o2.dose, 0].find((v) => v !== undefined);  // @limit array literal mixing a missing value with a number (find/filter)
export const h8 = (o2: { dose?: number }) => Math.max(...[o2.dose, 0].filter((v): v is number => v !== undefined));  // @limit array literal mixing a missing value with a number (find/filter)
export const h9 = (o2: { dose?: number }) => { switch (o2.dose) { case undefined: return 0; default: return o2.dose; } }; // @red D05
export const i1 = (o2: { dose?: number }) => { try { return o2.dose!.valueOf(); } catch { return 0; } }; // @red D05
export const i2 = (o2: { dose?: number }) => o2.dose?.valueOf() ?? 0; // @red D05
export const i3 = (o2: { dose?: number }) => (o2.dose ?? (() => 0)()); // @red D05
export const i4 = (o2: { dose?: number }) => o2.dose ?? (cfg.phi); // @red D05
export const i5 = (o2: { dose?: number }) => o2.dose ?? cfg['phi']; // @red D05
export const i6 = (o2: { dose?: number }) => o2.dose ?? arr.length; // @red D05
export const i7 = (o2: { dose?: number }) => o2.dose ?? -0; // @red D05
export const i8 = (o2: { dose?: number }) => o2.dose ?? 0n; // @red D05
export const i9 = (o2: { dose?: number }) => o2.dose ?? ~0; // @red D05
// rounding
export const r1 = (v: number) => Math.round?.(v); // @red R01
export const r2 = (v: number) => Reflect.apply(Math.round, undefined, [v]); // @red R01
export const r3 = (v: number) => (0, Math.round)(v); // @red R01
export const r4 = (v: number) => Math.sign(v) * Math.abs(v - (v % 1)); // @red R06
export const r5 = (v: number) => Number(v.toString().split('.')[0]); // @red R06
export const r6 = (v: number) => Number(String(v).slice(0, 4)); // @red R06
export const r7 = (v: number) => v - (v % 1.0); // @red R06
export const r8 = (v: number) => v - (v % 0.5); // @red R06
export const r9 = (v: number) => (v * 100 - ((v * 100) % 1)) / 100; // @red R06
export const s1 = (v: number) => new Intl.NumberFormat().format(v); // @red R05
export const s2 = (v: number) => Intl.NumberFormat; // @red R05
export const s3 = (v: number) => v.toLocaleString; // @red R04
export const s4 = (v: number) => (v as any)['toLo' + 'caleString']();  // @limit computed non-literal property name on an any-typed receiver
export const s5 = (v: number) => Number(v.toFixed); // @red R03
export const s6 = (v: number) => new Float32Array([v])[0]; // @red R06
export const s7 = (v: number) => Math.fround; // @red R01
export const s9 = (v: number) => Number.parseFloat(v.toFixed); // @red R03
export const t1 = (v: number) => Number.isInteger(v); // @ok
export const t2 = (v: number) => v.toString(); // @ok
export const t3 = (v: number) => v.toString(10); // @ok
export const t4 = (v: string) => parseFloat(v); // @ok
export const t5 = (v: number, w: number) => v % w;  // @red R06
export const t6 = (v: number) => v % 2; // @ok
export const t7 = (v: number) => Math.sqrt(v) + Math.PI; // @ok
export const t8 = (v: number) => v / 3; // @ok
export const t9 = (v: number) => `${v}`; // @ok
export const u1 = (v: number) => v | 1; // @ok
export const u2 = (v: number) => v ^ 0; // @red R06
export const u3 = (v: number) => v << 0; // @red R06
export const u4 = (v: number) => (v | 0.0); // @red R06
export const u5 = (v: number) => (v | -0); // @red R06
export const u6 = (v: number) => v | (0 as number); // @red R06
export const u7 = (v: number) => v | seven - 7; // @red R06
export const u8 = (v: number) => ~(~v); // @red R06
export const u9 = (v: number) => ~-~v; // @red R06
export const w1 = (v: number) => (v >> 0n as never); // @red R06
export const w2 = (v: number) => Math.imul(v, 1); // @red R01
export const w3 = (v: number) => Math.clz32(v); // @ok
export const w4 = (v: number) => new Int32Array([v])[0]; // @red R06
export const w5 = (v: number) => new Uint8Array([v])[0]; // @red R06
export const w6 = (v: number) => Number(BigInt.asIntN(32, BigInt(v))); // @red R06
export const w7 = (v: number) => v.toString().padEnd(3); // @ok
export const w8 = (v: number) => (v as number).toFixed(); // @red R03
export const w9 = (v: number) => Intl.NumberFormat.supportedLocalesOf('el');  // @red R05
