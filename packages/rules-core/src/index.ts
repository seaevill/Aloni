// rules-core: pure TypeScript, no I/O, no clock, shared by client and server (TECH-SPEC §3).
// M0 skeleton only. Rules arrive in M3.
export const RULES_CORE_VERSION = '0.0.0';

/** A value that may be unknown. Missing label data is never defaulted (CLAUDE.md safety rule 1). */
export type Known<T> = { known: true; value: T } | { known: false };
export const known = <T,>(value: T): Known<T> => ({ known: true, value });
export const unknown: Known<never> = { known: false };
