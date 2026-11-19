import { mayNotify, type NotifySettings, type RuleMode } from './policy';

/** The rules of docs/plan/RULES.md as the owner sees them. A rule is SIGNED only when the owner recorded the agronomist's approval (settings key `rule_signoffs`: {id: {by, on}}); until then it is
 * information only and NEVER sends a notification. There is no screen that records a sign-off yet, so today every rule is unsigned. */
export const RULE_IDS = ['spray_win', 'phi', 'phi_guard', 'rei', 'rot', 'reg', 'stock', 'frost', 'dm_spin', 'lwd', 'n', 'irr', 'salt', 'sow', 'harv_fc', 'gap'] as const;
export type RuleId = (typeof RULE_IDS)[number];
export const SIGNOFF_KEY = 'rule_signoffs';
export interface Signoff { by: string; on: string }

export const isSigned = (signoffs: Record<string, unknown> | undefined, id: RuleId): boolean => {
  const s = signoffs?.[id] as Partial<Signoff> | undefined;
  return !!s && typeof s.by === 'string' && s.by.trim() !== '' && typeof s.on === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.on);
};
export const modeOf = (signoffs: Record<string, unknown> | undefined, id: RuleId): RuleMode => (isSigned(signoffs, id) ? 'decide' : 'info_only');

/** What the owner is told about a rule at a given moment: signed + allowed, signed but quiet/off, or unsigned (never). */
export type RuleNotice = 'unsigned' | 'allowed' | 'quiet' | 'off';
export function noticeOf(signoffs: Record<string, unknown> | undefined, id: RuleId, now: Date, s: NotifySettings): RuleNotice {
  if (!isSigned(signoffs, id)) return 'unsigned';   // whatever the switch says, an unsigned rule is shown as such
  const v = mayNotify(modeOf(signoffs, id), now, s);
  if (v.send) return 'allowed';
  return v.why === 'unsigned_rule' ? 'unsigned' : v.why === 'quiet_hours' ? 'quiet' : 'off';
}
