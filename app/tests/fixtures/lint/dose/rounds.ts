export const a = (x: number) => Math.round(x);
export const b = (x: number) => Math.floor(x) + Math.ceil(x);
export const c = (x: number) => x.toFixed(2);
export const d = (x: number | undefined) => x ?? 0;
export const e = (x: number | undefined) => x || 1;
