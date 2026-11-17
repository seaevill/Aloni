import { useState } from 'preact/hooks';
import { activeFarm, dataVersion, db, loadDemo, realFarmId } from '../db';
import { tab } from './nav';
import { DEMO_FARM_ID } from '../config';
import { lang, t, type I18nKey } from '../i18n';
import { formatArea, formatQty } from '../i18n/format';
import { archived, restored } from '../parcels/parcel';
import { put } from '../repo';
import { Analyses } from './Analyses';
import { HarvestForm, Harvests } from './HarvestForm';
import { SprayForm } from './SprayForm';
import { Sprays } from './Sprays';
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
  const [spraying, setSpraying] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [harvesting, setHarvesting] = useState(false);
  const [harvested, setHarvested] = useState(false);
  const rows = [useRows('parcels'), useRows('plantings'), useRows('products'), useRows('stock_lots'), useRows('crops')];
  const [parcels, plantings, products, lots, crops] = rows;
  const live = (q: Rows) => q.rows?.filter((r) => !r.deleted_at) ?? [];
  const demo = activeFarm.value !== realFarmId.value;
  const cropsInUse = demo ? live(crops).length : new Set(live(plantings).map((p) => p.crop_id)).size;
  const loaded = rows.every((q) => q.rows);
  const has = live(parcels).length + live(plantings).length + live(products).length + live(lots).length + (demo ? live(crops).length : 0) > 0;
  if (harvesting) return <HarvestForm onDone={(saved) => { setHarvesting(false); setHarvested(saved); }} />;
  if (spraying) return <SprayForm onDone={(saved) => { setSpraying(false); setRecorded(saved); }} />;
  return (
    <section>
      <Title k="today.title" />
      {rows.some((q) => q.failed) && <ErrorState onRetry={retry} />}
      {loaded && !has && (
        <EmptyState message={t('today.empty')} actionLabel={t('parcel.add')} onAction={() => { tab.value = 'parcels'; }} secondLabel={t('more.loadDemo')} onSecond={() => void loadDemo()} />
      )}
      {loaded && has && !demo && <button class="btn" data-testid="spray-open" onClick={() => setSpraying(true)}>{t('spray.add')}</button>}
      {loaded && has && !demo && <button class="btn" data-testid="harvest-open" onClick={() => setHarvesting(true)}>{t('harvest.add')}</button>}
      {harvested && <p class="msg" role="status" data-testid="harvest-saved">{t('harvest.saved')}</p>}
      {recorded && <p class="msg" role="status" data-testid="spray-saved">{t('spray.saved')}</p>}
      {loaded && has && !demo && <Sprays />}
      {loaded && has && !demo && <Harvests />}
      {loaded && has && <p class="card" data-testid="today-counts">{t('today.counts', { parcels: live(parcels).length, crops: formatQty(cropsInUse), plantings: formatQty(live(plantings).length) })}</p>}
    </section>
  );
}

export function Parcels() {
  const [adding, setAdding] = useState(false);
  const [analysing, setAnalysing] = useState<Row | undefined>(undefined);
  const q = useRows('parcels');
  if (adding) return <ParcelForm onDone={() => setAdding(false)} />;
  if (analysing) return <Analyses parcel={analysing} onBack={() => setAnalysing(undefined)} />;
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
          {!demo && <button class="btn secondary" data-testid="analysis-open" onClick={() => setAnalysing(r)}>{t('analysis.open')}</button>}
          {!demo && <button class="btn secondary" onClick={() => void archive(r)}>{t('parcel.archive')}</button>}
        </div>
      ))}
    </section>
  );
}
