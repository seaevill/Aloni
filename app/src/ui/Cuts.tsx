import { formatDateTime, t } from '../i18n';
import { cutFromParcel } from '../spray/harvest';
import { instantOf } from '../spray/time';
import { useRows } from './useRows';

/** Today: for each field, from when it may be cut. Only stored label values count; any unknown waiting period makes the field «unknown» and blocked. */
export function Cuts() {
  const parcels = useRows('parcels'); const plantings = useRows('plantings'); const links = useRows('job_plantings'); const sprays = useRows('job_spray');
  const now = instantOf(new Date()) ?? '';
  const cards = (parcels.rows ?? []).filter((p) => !p.deleted_at).map((p) => {
    const c = cutFromParcel(p.id, now, plantings.rows ?? [], links.rows ?? [], sprays.rows ?? []);
    return { p, state: c.state, line: c.state === 'free' ? t('cut.free') : c.state === 'unknown' ? t('cut.unknown') : t('cut.from', { d: formatDateTime(c.at) }) };
  });
  return (
    <>
      <h2>{t('cut.title')}</h2>
      {cards.map(({ p, state, line }) => (
        <div class={state === 'unknown' ? 'card blocked' : 'card'} key={p.id} data-testid="cut" data-state={state}>{String(p.name)}
          <span class={state === 'unknown' ? 'badge blocked' : state === 'from' ? 'badge unsigned' : 'badge calm'} data-testid="cut-line">{line}</span>
        </div>
      ))}
    </>
  );
}
