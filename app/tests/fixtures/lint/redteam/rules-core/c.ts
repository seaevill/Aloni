export const a = (d0: Date) => d0.getTime(); // @ok
export type T = { at: Date }; // @ok
export const b = (d0: Date): number => d0.getTime(); // @ok
export const c = (n: number) => new Date(n + 1); // @ok
