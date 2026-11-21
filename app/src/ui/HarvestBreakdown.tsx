import { formatDateTime, lang, t } from '../i18n';
import { Card, PageHead, ListRow } from './ds';
import el from '../content/harvest/el.json';
import en from '../content/harvest/en.json';
import hi from '../content/harvest/hi.json';
import tr from '../content/harvest/tr.json';

export interface HarvestSource {
  crop: string;
  parcel: string;
  worker?: string;
  at: string;
  count: string;
}

// TODO(ds): DetailSheet
export function HarvestBreakdown({ source, onBack }: { source: HarvestSource; onBack: () => void }) {
  const destination = ({ el, en, hi, tr })[lang.value].destination;
  return <section data-testid="harvest-breakdown">
    <PageHead heading={source.crop} back={onBack} backText={t('info.back')} />
    <Card>
      <p data-testid="harvest-breakdown-count">{source.count}</p>
      <ListRow heading={t('register.col.parcel')} meta={source.parcel} />
      {source.worker !== undefined && <ListRow heading={t('harvest.cutby')} meta={source.worker} />}
      <ListRow heading={t('harvest.time')} meta={formatDateTime(source.at)} />
      {/* TODO(B1): Read the authoritative destination when the harvest record supplies it. */}
      <small data-testid="harvest-destination">{destination}</small>
    </Card>
  </section>;
}
