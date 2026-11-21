import type { AppDB } from '../db/schema';
import { putLocal } from '../repo';

// A local error log (no tracking): the app's own errors are kept ONLY on this phone (device-local settings, never queued for the server), newest first, at most 30, scrubbed of ids and
// of everything after «?» or «#» in an address. The owner copies a report («Αναφορά σφάλματος») and sends it herself. NOTHING is sent over the network by this file.
export interface LoggedError { at: string; kind: 'error' | 'rejection'; message: string; stack: string }
const KEY = 'error_log'; const MAX = 30; const LIMIT = 600;

/** Ids become «<id>», addresses lose their query and fragment, and long text is cut. */
export function scrub(text: string): string {
  return text
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<id>')
    .replace(/(https?:\/\/[^\s?#)]+)[?#][^\s)]*/g, '$1')
    .slice(0, LIMIT);
}

const isEntry = (v: unknown): v is LoggedError => typeof v === 'object' && v !== null && typeof (v as LoggedError).at === 'string' && typeof (v as LoggedError).message === 'string';

export async function readErrors(db: AppDB): Promise<LoggedError[]> {
  const v = (await db.settings.get(KEY))?.value;
  return Array.isArray(v) ? v.filter(isEntry) : [];
}

export async function recordError(db: AppDB, e: { kind: LoggedError['kind']; message: string; stack: string }, at: string): Promise<void> {
  const next: LoggedError = { at, kind: e.kind, message: scrub(e.message), stack: scrub(e.stack) };
  await putLocal(db, KEY, [next, ...(await readErrors(db))].slice(0, MAX));
}

export async function clearErrors(db: AppDB): Promise<void> { await putLocal(db, KEY, []); }

/** Plain text the owner can paste into a message: the version, the phone, the errors. It says nothing about the farm. */
export function formatReport(errors: readonly LoggedError[], env: { version: string; ua: string; lang: string }): string {
  const head = `Aloni error report\nversion: ${env.version}\nphone: ${scrub(env.ua)}\nlanguage: ${env.lang}\n`;
  if (errors.length === 0) return `${head}\n(no errors recorded)\n`;
  return `${head}\n${errors.map((e) => `${e.at} ${e.kind}\n${e.message}\n${e.stack}`).join('\n\n')}\n`;
}

/** Listens for the page's own errors and unhandled rejections; a failure of the log itself is swallowed (it must never cause an error of its own). */
export function installErrorLog(db: AppDB): void {
  const log = (kind: LoggedError['kind'], message: string, stack: string) => { void recordError(db, { kind, message, stack }, new Date().toISOString()).catch(() => undefined); };
  window.addEventListener('error', (ev) => log('error', ev.message || 'error', ev.error instanceof Error ? ev.error.stack ?? '' : ''));
  window.addEventListener('unhandledrejection', (ev) => { const r = ev.reason; log('rejection', r instanceof Error ? r.message : String(r), r instanceof Error ? r.stack ?? '' : ''); });
}
