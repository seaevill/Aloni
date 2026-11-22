import { parsePhiDays, parseReiHours, phiEnd, reiEnd } from '@aloni/rules-core';
import type { Row } from '../db/schema';
import { formatDateTime, t } from '../i18n';
import { NOT_ON_LABEL } from '../labels/label-use';

const text = (v: unknown): string => (typeof v === 'string' ? v : '');
/** The waiting period as a sentence, or undefined when it is unknown (the card then says so, in red). Recomputed from the stored days and time. */
export const waitLine = (r: Row, days: 'phi_days' | 'rei_hours'): string | undefined => {
  const v = text(r[days]);
  if (!v || v === NOT_ON_LABEL) return undefined;
  const end = days === 'phi_days' ? phiEnd(text(r.sprayed_at), parsePhiDays(v)) : reiEnd(text(r.sprayed_at), parseReiHours(v));
  return end.known ? t(days === 'phi_days' ? 'spray.phi.until' : 'spray.rei.until', { d: formatDateTime(end.value) }) : undefined;
};
