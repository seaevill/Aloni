import { t } from '../i18n';
import { BackBar } from './BackBar';
import { Harvests } from './HarvestForm';
import { Sprays } from './Sprays';
import { EditTrail } from './EditTrail';
import { nameOf } from './screens';
import { useRows } from './useRows';
import { editsOf } from '../records/edits';

/** The records of the past, on their own screen (Σήμερα keeps only what matters today). A fixed top bar with a back chevron. */
export function History({ readOnly, onBack }: { readOnly: boolean; onBack: () => void }) {
  const parcels = useRows('parcels'); const plantings = useRows('plantings'); const crops = useRows('crops');
  const edited = [...(parcels.rows ?? []), ...(plantings.rows ?? [])].filter((r) => editsOf(r).length > 0);
  const title = (r: { id: unknown; crop_id?: unknown; name?: unknown }): string => (typeof r.name === 'string' ? r.name : nameOf(crops.rows?.find((c) => c.id === r.crop_id) ?? {}));
  return (
    <section class="history" data-testid="history">
      <BackBar onBack={onBack} testId="history-back" />
      <h1 tabIndex={-1}>{t('history.title')}</h1>
      <Sprays readOnly={readOnly} />
      <Harvests />
      {edited.length > 0 && <h2>{t('history.edits')}</h2>}
      {edited.map((r) => <div class="card" key={String(r.id)} data-testid="history-edited">{title(r)}<EditTrail row={r} /></div>)}
    </section>
  );
}
