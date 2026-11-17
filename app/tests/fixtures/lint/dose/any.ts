// `any` is banned in dose and rules-core code: it switches the type-aware rules off.
export const a = (x: any) => x; // @red @typescript-eslint/no-explicit-any
export const b = (x: unknown) => x as any; // @red @typescript-eslint/no-explicit-any
export const c = (x: unknown) => x; // @ok
