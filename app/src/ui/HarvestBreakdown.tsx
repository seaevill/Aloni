import { formatDateTime, lang, t, tn } from '../i18n';
import { activeFarm } from '../db';
import { harvestGate } from '../spray/harvest';
import { instantOf } from '../spray/time';
import { useRows } from './useRows';
import { Card, PageHead, ListRow, SectionHead } from './ds';
import el from '../content/harvest/el.json';
import en from '../content/harvest/en.json';
import hi from '../content/harvest/hi.json';
import tr from '../content/harvest/tr.json';

export interface HarvestEvent {
  id: string;
  parcel: string;
  worker?: string;
  at: string;
  count: string;
  destination: 'store' | 'direct' | 'unknown';
  plantingId: string;
  crates: number | undefined;
}

export interface HarvestSource extends HarvestEvent {
  crop: string;
  history: readonly HarvestEvent[];
}

const copy = { el, en, hi, tr };
const dateText = (at: string) => at ? formatDateTime(at) : t('value.unknown');
const groups = ['store', 'direct', 'unknown'] as const;
const label = (destination: HarvestEvent['destination']) => destination === 'store' ? t('ui.done.dest.store')
  : destination === 'direct' ? t('ui.done.dest.dispatch') : copy[lang.value].destination;

// TODO(ds): DetailSheet
export function HarvestBreakdown({ source, onBack }: { source: HarvestSource; onBack: () => void }) {
  const farm = activeFarm.value;
  const owned = (rows: ReturnType<typeof useRows>['rows']) => rows?.filter((row) => row.farm_id === farm);
  const plantings = owned(useRows('plantings').rows);
  const links = owned(useRows('job_plantings').rows);
  const sprays = owned(useRows('job_spray').rows);
  const labels = owned(useRows('label_uses').rows);
  const now = instantOf(new Date());
  const eligible = (event: HarvestEvent): event is HarvestEvent & { crates: number } => {
    if (event.crates === undefined || !now || !plantings || !links || !sprays || !labels) return false;
    const at = instantOf(new Date(event.at));
    return !!at && at <= now && plantings.some((planting) => planting.id === event.plantingId)
      && harvestGate(event.plantingId, now, links, sprays, plantings, labels).ok;
  };
  return <section data-testid="harvest-breakdown">
    <PageHead heading={source.crop} back={onBack} backText={t('info.back')} />
    <Card>
      <p data-testid="harvest-breakdown-count">{source.count}</p>
      <ListRow heading={t('register.col.parcel')} meta={source.parcel} />
      {source.worker !== undefined && <ListRow heading={t('harvest.cutby')} meta={source.worker} />}
      <ListRow heading={t('harvest.time')} meta={dateText(source.at)} />
      <small data-testid="harvest-destination">{label(source.destination)}</small>
    </Card>
    <section data-testid="harvest-crop-history">
      <SectionHead heading={t('history.title')} />
      {groups.map((group) => {
        const records = source.history.filter((event) => event.destination === group);
        const counted = group === 'unknown' ? [] : records.filter(eligible);
        const total = counted.length ? counted.reduce((sum, event) => sum + event.crates, 0) : undefined;
        return <Card key={group} testid="harvest-destination-group">
          <h3>{label(group)}</h3>
          {total !== undefined && <p data-testid="harvest-destination-total">{tn('harvest.count', total)}</p>}
          {group !== 'unknown' && records.length > 0 && counted.length < records.length && <p class="muted">{copy[lang.value].excluded}</p>}
          {records.length === 0 && <p class="muted">{t('harvest.empty')}</p>}
          {records.map((event) => <div key={event.id} data-testid="harvest-crop-event">
            <ListRow heading={event.parcel} meta={event.count} />
            <small>{dateText(event.at)}</small>
            {event.worker !== undefined && <p><small>{t('harvest.cutby.line', { name: event.worker })}</small></p>}
          </div>)}
        </Card>;
      })}
    </section>
  </section>;
}
