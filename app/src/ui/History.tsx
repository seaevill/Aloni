import { t } from '../i18n';
import { BackBar } from './BackBar';
import { useState } from 'preact/hooks';
import { HarvestHistory } from './HarvestHistory';
import type { HarvestSource } from './HarvestBreakdown';
import { Sprays } from './Sprays';
import { EditTrail } from './EditTrail';
import { nameOf } from './screens';
import { useRows } from './useRows';
import { editsOf } from '../records/edits';

/** The records of the past, on their own screen (Σήμερα keeps only what matters today). A fixed top bar with a back chevron. */
export function History({ readOnly, onBack }: { readOnly: boolean; onBack: () => void }) {
  const [harvest, setHarvest] = useState<{ source: HarvestSource; Breakdown: typeof import('./HarvestBreakdown').HarvestBreakdown } | undefined>(undefined);
  const [sourceFailed, setSourceFailed] = useState(false);
  const parcels = useRows('parcels'); const plantings = useRows('plantings'); const crops = useRows('crops');
  const edited = [...(parcels.rows ?? []), ...(plantings.rows ?? [])].filter((r) => editsOf(r).length > 0);
  const title = (r: { id: unknown; crop_id?: unknown; name?: unknown }): string => (typeof r.name === 'string' ? r.name : nameOf(crops.rows?.find((c) => c.id === r.crop_id) ?? {}));
  const openHarvest = async (source: HarvestSource) => {
    setSourceFailed(false);
    try {
      const { HarvestBreakdown: Breakdown } = await import('./HarvestBreakdown');
      setHarvest({ source, Breakdown });
    } catch {
      setSourceFailed(true);
    }
  };
  if (harvest) return <harvest.Breakdown source={harvest.source} onBack={() => setHarvest(undefined)} />;
  return (
    <section class="history" data-testid="history">
      <BackBar onBack={onBack} testId="history-back" />
      <h1 tabIndex={-1}>{t('history.title')}</h1>
      {sourceFailed && <p role="alert">{t('state.error')}</p>}
      <Sprays readOnly={readOnly} />
      <HarvestHistory onOpen={(source) => void openHarvest(source)} owner />
      {edited.length > 0 && <h2>{t('history.edits')}</h2>}
      {edited.map((r) => <div class="card" key={String(r.id)} data-testid="history-edited">{title(r)}<EditTrail row={r} /></div>)}
    </section>
  );
}
