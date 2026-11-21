import { tx } from '../../content/tx';
import { formatDate } from '../../i18n';
import { formatQty } from '../../i18n/format';

export function SourceLine({ count, last }: { count?: number; last?: string }) {
  const origin = count === undefined ? undefined : tx(count === 1 ? 'cx.source.count.one' : 'cx.source.count.other', { n: formatQty(count) });
  const recent = last ? tx('cx.source.last', { date: formatDate(last) }) : undefined;
  const line = [origin, recent].filter(Boolean).join(' · ') || tx('cx.source.none');
  return <small class="cx-source-line">{line}</small>;
}
