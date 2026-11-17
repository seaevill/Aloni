import { activeFarm } from '../db';
import { DEMO_FARM_ID } from '../config';
import { lang, t } from '../i18n';
import { formatArea, formatQty } from '../i18n/format';
import { useRows } from './useRows';

function Title({ k }: { k: string }) {
  return (
    <h1>
      {t(k)}
      {activeFarm.value === DEMO_FARM_ID && <span class="badge">{t('badge.demo')}</span>}
    </h1>
  );
}

const nameOf = (r: Record<string, unknown>) =>
  String(r[`name_${lang.value}`] ?? r.name_en ?? r.name ?? r.label ?? r.id);

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
        : <p class="card" data-testid="today-counts">{t('today.counts', { parcels: parcels.length, crops: crops?.length ?? 0, plantings: plantings?.length ?? 0 })}</p>)}
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
