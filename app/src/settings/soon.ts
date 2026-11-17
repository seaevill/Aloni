import { known, parseWhole, type Known } from '@aloni/rules-core';

/** The setting «warn this many days before a lot expires» (information only; it decides nothing). Stored as text in the settings table, changed in More. */
export const SOON_SETTING = 'soon_days';
export const SOON_MIN = 1;
export const SOON_MAX = 365;
const DEFAULT_TEXT = '60'; // Bora, 2026-11-17: 60 days is fine; he can change it

/** A usable number of days, or unknown. Nothing stored = the default text; damaged or out-of-range text is unknown (no «soon» flag), never a guess. */
export function parseSoonDays(stored: unknown): Known<number> {
  if (stored !== undefined && typeof stored !== 'string') return { known: false, reason: 'invalid' }; // a damaged value is not «nothing stored»
  const p = parseWhole<'SoonDays'>(stored ?? DEFAULT_TEXT);
  return p.known && p.value >= SOON_MIN && p.value <= SOON_MAX ? known(p.value) : { known: false, reason: 'invalid' };
}

/** The text to store, or undefined if it is not a whole number from 1 to 365. */
export const soonTextOf = (typed: string): string | undefined => { const p = parseSoonDays(typed.trim() === '' ? 'x' : typed.trim()); return p.known ? typed.trim() : undefined; };
