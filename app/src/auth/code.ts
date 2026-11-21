// The e-mail sign-in code: exactly six digits, no link. Pure helpers (the screen and the tests use the same ones).
import { AuthHttp } from './gotrue';

/** The six digits, or undefined when what was typed is not exactly six digits (spaces and a dash from copy/paste are ignored). */
export function cleanCode(typed: string): string | undefined {
  const s = typed.replace(/[\s-]/g, '');
  return /^\d{6}$/.test(s) ? s : undefined;
}

export type CodeError = 'wrong' | 'expired' | 'rate' | 'server' | 'net' | 'other';
/** Why a sign-in step failed, as a key for the Greek message. Unknown reasons are 'other', never «wrong code». */
export function codeError(e: unknown): CodeError {
  if (e instanceof AuthHttp) {
    if (e.status === 400 || e.status === 401) return 'wrong';
    if (e.status === 403) return 'expired';
    if (e.status === 429) return 'rate';
    if (e.status >= 500) return 'server';
    return 'other';
  }
  return e instanceof TypeError ? 'net' : 'other';
}

export const RESEND_WAIT_S = 60;
/** Seconds the «Νέος κωδικός» button must still wait, given the whole seconds since the last send (the screen counts them; no clock arithmetic here). 0 = free. */
export function resendLeft(secondsSinceSend: number): number {
  return secondsSinceSend >= RESEND_WAIT_S ? 0 : RESEND_WAIT_S - secondsSinceSend;
}
