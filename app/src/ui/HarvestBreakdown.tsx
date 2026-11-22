import { formatDateTime, lang, t, tn } from '../i18n';
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
  eligibleCrates: number | undefined;
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
        const eligible = group === 'unknown' ? [] : records.flatMap((event) => event.eligibleCrates === undefined ? [] : [event.eligibleCrates]);
        const total = eligible.length ? eligible.reduce((sum, crates) => sum + crates, 0) : undefined;
        return <Card key={group} testid="harvest-destination-group">
          <h3>{label(group)}</h3>
          {total !== undefined && <p data-testid="harvest-destination-total">{tn('harvest.count', total)}</p>}
          {group !== 'unknown' && records.length > 0 && eligible.length < records.length && <p class="muted">{copy[lang.value].excluded}</p>}
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
