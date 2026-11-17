import { useState } from 'preact/hooks';
import { activeFarm, dataVersion, db, loadDemo, realFarmId } from '../db';
import { DEMO_FARM_ID } from '../config';
import { lang, t, type I18nKey } from '../i18n';
import { formatArea, formatQty } from '../i18n/format';
import { archived, restored } from '../parcels/parcel';
import { put } from '../repo';
import { ParcelForm } from './ParcelForm';
import { EmptyState, ErrorState, UnsyncedMark } from './states';
import { showUndo } from './Toast';
import type { Row } from '../db/schema';
import { useRows, type Rows } from './useRows';

export function Title({ k }: { k: I18nKey }) {
  return (
    <h1>
      {t(k)}
      {activeFarm.value === DEMO_FARM_ID && <span class="badge">{t('badge.demo')}</span>}
    </h1>
  );
}

export const nameOf = (r: Record<string, unknown>) =>
  String(r[`name_${lang.value}`] ?? r.name_en ?? r.name ?? r.label ?? r.id);

export const retry = () => { dataVersion.value++; };

/** The two states every list has: an error that says what to do next, and an empty state with ONE action. */
export function Status({ q, message, action }: { q: Rows; message: string; action?: { label: string; run: () => void } }) {
  return (
    <>
      {q.failed && <ErrorState onRetry={retry} />}
      {q.rows && !q.rows.length && <EmptyState message={message} actionLabel={action?.label ?? t('more.loadDemo')} onAction={action?.run ?? (() => void loadDemo())} />}
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

export function Parcels() {
  const [adding, setAdding] = useState(false);
  const q = useRows('parcels');
  if (adding) return <ParcelForm onDone={() => setAdding(false)} />;
  const demo = activeFarm.value !== realFarmId.value;
  const live = q.rows?.filter((r) => !r.deleted_at) ?? [];
  const archive = async (r: Row) => {
    await put(db, 'parcels', archived(r, new Date().toISOString()));
    dataVersion.value++;
    showUndo(t('parcel.archived'), async () => { await put(db, 'parcels', restored(r, new Date().toISOString())); dataVersion.value++; });
  };
  return (
    <section>
      <Title k="parcels.title" />
      {demo ? <p class="muted" data-testid="parcel-demo-note">{t('parcel.demoActive')}</p> : live.length > 0 && <button class="btn" data-testid="parcel-add" onClick={() => setAdding(true)}>{t('parcel.add')}</button>}
      <Status q={{ ...q, rows: q.rows && live.length === 0 ? [] : q.rows }} message={t('list.empty')} action={demo ? undefined : { label: t('parcel.add'), run: () => setAdding(true) }} />
      {live.map((r) => (
        <div class="card" key={r.id}>{String(r.name)}{typeof r.area_str !== 'undefined' && <small>{formatArea(r.area_str as number | string)}</small>}<UnsyncedMark id={r.id} />
          {!demo && <button class="btn secondary" onClick={() => void archive(r)}>{t('parcel.archive')}</button>}
        </div>
      ))}
    </section>
  );
}
