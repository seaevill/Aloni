declare const s: string | undefined;
declare const n: number | undefined;
declare const list: string[];
declare const MAX_ROWS: number;
export const p1 = (page: number | undefined, MAX: number) => page ?? MAX; // @red D05
export const p2 = (name: string | undefined) => name || 'x'; // @ok
export const p3 = (list2: unknown[]) => list2.length || 1; // @red D05
export const p4 = (i: number) => (i % 2 === 0 ? 'even' : 'odd'); // @ok
export const p5 = (m: Map<string, number>) => m.get('a')?.toString() ?? '-'; // @ok
export const p6 = (i: number) => i === 0 ? 1 : 2; // @ok
export const p7 = (o: { a?: number }) => (o.a === undefined ? 'none' : o.a); // @ok
export const p8 = (a: number, b: number) => (a > b ? a : 0); // @ok
export const p9 = (delay: number | undefined) => delay ?? 250; // @red D05
export const q1 = (s2: string) => s2.split(',').map(Number); // @ok
export const q2 = (xs: number[]) => xs.reduce((a, b) => a + b, 0); // @ok
export const q3 = (xs: number[]) => xs.slice(0, 3); // @ok
export const q4 = (xs: number[], i = 0) => xs[i]; // @red D05
export const q5 = (x: number) => (x < 0 ? -1 : 1); // @ok
export const q6 = (x: number) => x === undefined ? 0 : 1;  // @ok
export const q7 = (x: number | null) => x === null ? undefined : x; // @ok
export const q8 = (x: number) => Math.max(0, x); // @ok
export const q9 = (x: number) => Math.min(Math.max(x, 0), 100); // @ok
export const r1 = (a: unknown) => a === null ? 'null' : typeof a; // @ok
export const r2 = (cb: () => void, ms: number | undefined) => ms ?? MAX_ROWS; // @red D05
export const r3 = (o: { retries?: number }) => o.retries ?? 3; // @red D05
