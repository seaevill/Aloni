// A label value is either known or unknown, never "defaulted" (CLAUDE.md safety rule 1).
// `unknown` always says why: nothing entered, «δεν αναγράφεται» (not on the label), or invalid text.
export type UnknownReason = 'missing' | 'not_on_label' | 'invalid';
export type Known<T> = { readonly known: true; readonly value: T } | { readonly known: false; readonly reason: UnknownReason };

export const known = <T>(value: T): Known<T> => ({ known: true, value });
export const unknown = (reason: UnknownReason): Known<never> => ({ known: false, reason });
export const notOnLabel = (): Known<never> => unknown('not_on_label');
