// Notifications (M4 preparation): WHEN a notification may be sent. Nothing is sent by this code; it is the gate a sender must pass. Two locks:
//   1. a rule that is not SIGNED (the engine says mode «info_only») never notifies: unsigned rules may show data, never decide or send (CLAUDE.md safety rule 3);
//   2. nothing is sent in the quiet hours (default 21:00–05:30, Athens time), and nothing when the owner switched notifications off.
export interface NotifySettings { enabled: boolean; quietFrom: string; quietTo: string }
export const DEFAULT_NOTIFY: NotifySettings = { enabled: false, quietFrom: '21:00', quietTo: '05:30' };

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const validTime = (s: string): boolean => HHMM.test(s);
const TWO = new Map(Array.from({ length: 60 }, (_, i) => [String(i).padStart(2, '0'), i] as const));   // «05» → 5 without parsing a number out of text
const minutes = (s: string): number | undefined => { const m = HHMM.exec(s); const h = m ? TWO.get(m[1]) : undefined; const n = m ? TWO.get(m[2]) : undefined; return h === undefined || n === undefined ? undefined : h * 60 + n; };

const ATHENS = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', hourCycle: 'h23', hour: '2-digit', minute: '2-digit' });
/** The Athens wall clock of an instant as «HH:MM». */
export const athensClock = (d: Date): string => ATHENS.format(d);

/** true when `now` falls inside the quiet hours; the window may cross midnight (21:00 → 05:30). An unreadable setting counts as quiet (never send on a guess). */
export function inQuietHours(now: Date, s: Pick<NotifySettings, 'quietFrom' | 'quietTo'>): boolean {
  const from = minutes(s.quietFrom); const to = minutes(s.quietTo); const at = minutes(athensClock(now));
  if (from === undefined || to === undefined || at === undefined) return true;
  if (from === to) return false;                       // an empty window: no quiet hours
  return from < to ? at >= from && at < to : at >= from || at < to;
}

export type RuleMode = 'decide' | 'info_only';
export type NotifyVerdict = { send: true } | { send: false; why: 'off' | 'unsigned_rule' | 'quiet_hours' };
/** The ONE gate for sending: owner switch, a signed (deciding) rule, outside the quiet hours. */
export function mayNotify(mode: RuleMode, now: Date, s: NotifySettings): NotifyVerdict {
  if (!s.enabled) return { send: false, why: 'off' };
  if (mode !== 'decide') return { send: false, why: 'unsigned_rule' };
  if (inQuietHours(now, s)) return { send: false, why: 'quiet_hours' };
  return { send: true };
}
