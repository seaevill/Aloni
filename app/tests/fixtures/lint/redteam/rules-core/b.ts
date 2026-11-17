declare const iso: string;
export const a = (x: string) => new Date(x as string); // @red K01
export const b = (x?: string) => new Date(x!); // @red K01
export const c = (x: string, y: string) => new Date(x || y); // @red K01
export const d = (x: string, y: string) => new Date(x ? x : y); // @red K01
export const e = (d0: Date) => new Date(d0.getTime() + 86400000); // @ok
export const f = (x: string) => new Date(`${x}T00:00:00Z`).getTime(); // @ok
export const g = (x: number) => new Date(-x); // @ok
export const h = () => new Date(iso, ...[1]); // @red K01
