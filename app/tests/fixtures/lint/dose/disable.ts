// Inline lint switches must NOT work: a banned line stays red even with an eslint-disable comment.
// eslint-disable-next-line no-restricted-syntax
export const a = (x: number) => Math.round(x); // @red R01
/* eslint-disable */
export const b = (x: number) => Math.floor(x); // @red R01
/* eslint-enable */
export const c = (x: number) => x.toFixed(2); // eslint-disable-line no-restricted-syntax -- @red R03
// @ts-ignore -- @red @typescript-eslint/ban-ts-comment
export const d: number = 1; // @ok
