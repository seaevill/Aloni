import { formatDateTime, t } from '../i18n';
import type { Wait } from '../summary/wait';

/** «Τελευταίος ψεκασμός: … · Κοπή από …» for a card: the last spraying and the waiting state, in the words the harvest screens already use (free, from a time, unknown = blocked). */
export function waitLine(w: Wait): string {
  const last = w.lastSprayAt ? t('wait.last', { d: formatDateTime(w.lastSprayAt) }) : t('wait.none');
  if (w.state === 'planned') return [last, t('planting.status.planned')].join(' · ');
  if (w.state === 'free') return [last, t('cut.free')].join(' · ');
  if (w.state === 'running' && w.until) return [last, t('cut.from', { d: formatDateTime(w.until) })].join(' · ');
  return [last, t('cut.unknown')].join(' · ');
}
