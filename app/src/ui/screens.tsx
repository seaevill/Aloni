import { activeFarm, dataVersion, loadDemo } from '../db';
import { DEMO_FARM_ID } from '../config';
import { lang, t, type I18nKey } from '../i18n';
import { formatArea, formatQty } from '../i18n/format';
import { EmptyState, ErrorState, UnsyncedMark } from './states';
import { useRows, type Rows } from './useRows';

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

const retry = () => { dataVersion.value++; };

/** The two states every list has: an error that says what to do next, and an empty state with ONE action. */
function Status({ q, message }: { q: Rows; message: string }) {
  return (
    <>
      {q.failed && <ErrorState onRetry={retry} />}
      {q.rows && !q.rows.length && <EmptyState message={message} actionLabel={t('more.loadDemo')} onAction={() => void loadDemo()} />}
    </>
  );
}

export function Today() {
  const parcels = useRows('parcels');
  const crops = useRows('crops');
  const plantings = useRows('plantings');
  const empty = !parcels.rows?.length && !crops.rows?.length;
  return (
    <section>
      <Title k="today.title" />
      <Status q={{ ...parcels, rows: empty ? parcels.rows : [] }} message={t('today.empty')} />
      {parcels.rows && !empty && <p class="card" data-testid="today-counts">{t('today.counts', { parcels: parcels.rows.length, crops: formatQty(crops.rows?.length), plantings: formatQty(plantings.rows?.length) })}</p>}
    </section>
  );
}

export function Crops() {
  const q = useRows('crops');
  return (
    <section>
      <Title k="crops.title" />
      <Status q={q} message={t('list.empty')} />
      {q.rows?.map((r) => (
        <div class="card" key={r.id}>{nameOf(r)}{typeof r.latin === 'string' && <small>{r.latin}</small>}<UnsyncedMark id={r.id} /></div>
      ))}
    </section>
  );
}

export function Parcels() {
  const q = useRows('parcels');
  return (
    <section>
      <Title k="parcels.title" />
      <Status q={q} message={t('list.empty')} />
      {q.rows?.map((r) => (
        <div class="card" key={r.id}>{String(r.name)}{typeof r.area_str === 'number' && <small>{formatArea(r.area_str)}</small>}<UnsyncedMark id={r.id} /></div>
      ))}
    </section>
  );
}

export function Stock() {
  const q = useRows('products');
  return (
    <section>
      <Title k="stock.title" />
      <Status q={q} message={t('list.empty')} />
      {q.rows?.map((r) => (
        <div class="card" key={r.id}>{nameOf(r)}
          <small>{r.qty == null ? t('value.unknown') : `${formatQty(r.qty as number | string)} ${typeof r.unit === 'string' ? r.unit : ''}`}</small>
          <UnsyncedMark id={r.id} />
        </div>
      ))}
    </section>
  );
}
