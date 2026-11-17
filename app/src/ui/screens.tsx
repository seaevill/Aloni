import { activeFarm } from '../db';
import { DEMO_FARM_ID } from '../config';
import { lang, t, type I18nKey } from '../i18n';
import { formatArea, formatQty } from '../i18n/format';
import { useRows } from './useRows';

function Title({ k }: { k: I18nKey }) {
  return (
    <h1>
      {t(k)}
      {activeFarm.value === DEMO_FARM_ID && <span class="badge">{t('badge.demo')}</span>}
    </h1>
  );
}

const nameOf = (r: Record<string, unknown>) =>
  String(r[`name_${lang.value}`] ?? r.name_en ?? r.name ?? r.label ?? r.id);

/** Row count; an unloaded list shows 0 here, which is a count, not a label value. */
const count = (rows: unknown[] | null) => (rows ? rows.length : 0);

export function Today() {
  const parcels = useRows('parcels');
  const crops = useRows('crops');
  const plantings = useRows('plantings');
  const empty = !parcels?.length && !crops?.length;
  return (
    <section>
      <Title k="today.title" />
      {parcels && (empty
        ? <p class="card" data-testid="today-empty">{t('today.empty')}</p>
        : <p class="card" data-testid="today-counts">{t('today.counts', { parcels: parcels.length, crops: count(crops), plantings: count(plantings) })}</p>)}
    </section>
  );
}

export function Crops() {
  const rows = useRows('crops');
  return (
    <section>
      <Title k="crops.title" />
      {rows && !rows.length && <p class="muted">{t('list.empty')}</p>}
      {rows?.map((r) => (
        <div class="card" key={r.uid}>{nameOf(r)}{typeof r.latin === 'string' && <small>{r.latin}</small>}</div>
      ))}
    </section>
  );
}

export function Parcels() {
  const rows = useRows('parcels');
  return (
    <section>
      <Title k="parcels.title" />
      {rows && !rows.length && <p class="muted">{t('list.empty')}</p>}
      {rows?.map((r) => (
        <div class="card" key={r.uid}>{String(r.name)}{typeof r.area_str === 'number' && <small>{formatArea(r.area_str)}</small>}</div>
      ))}
    </section>
  );
}

export function Stock() {
  const rows = useRows('products');
  return (
    <section>
      <Title k="stock.title" />
      {rows && !rows.length && <p class="muted">{t('list.empty')}</p>}
      {rows?.map((r) => (
        <div class="card" key={r.uid}>{nameOf(r)}
          <small>{r.qty == null ? t('value.unknown') : `${formatQty(r.qty as number | string)} ${typeof r.unit === 'string' ? r.unit : ''}`}</small>
        </div>
      ))}
    </section>
  );
}
