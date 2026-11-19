import { useState } from 'preact/hooks';
import { activeFarm, dataVersion, db, loadDemo, realFarmId } from '../db';
import { tab } from './nav';
import { DEMO_FARM_ID } from '../config';
import { lang, t, type I18nKey } from '../i18n';
import { CATALOG, cropName } from '../crops/catalog';
import { formatArea, formatQty } from '../i18n/format';
import { archived, restored } from '../parcels/parcel';
import { put } from '../repo';
import { Analyses } from './Analyses';
import { EditTrail } from './EditTrail';
import { ParcelForm } from './ParcelForm';
import { ParcelDetail } from './ParcelDetail';
import { EmptyState, ErrorState, UnsyncedMark } from './states';
import { showUndo } from './Toast';
import type { Row } from '../db/schema';
import { useRows, type Rows } from './useRows';

export { Today } from './Today';

export function Title({ k }: { k: I18nKey }) {
  return (
    <h1>
      {t(k)}
    </h1>
  );
}

/** A record's name in the current language. Nothing found = an EMPTY text, never the word «undefined» (the lists load one after the other). */
export const nameOf = (r: Record<string, unknown>): string => {
  if (lang.value === 'hi' && typeof r.slug === 'string') { const c = CATALOG.find((x) => x.slug === r.slug); if (c) return cropName(c, 'hi'); } // «पालक · Σπανάκι»
  const found = r[`name_${lang.value === 'hi' ? 'el' : lang.value}`] ?? r.name_en ?? r.name ?? r.label ?? r.id;
  return typeof found === 'string' || typeof found === 'number' ? String(found) : '';
};

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

export function Parcels() {
  const demo = activeFarm.value !== realFarmId.value;
  const [adding, setAdding] = useState(false);
  const [analysing, setAnalysing] = useState<Row | undefined>(undefined);
  const [editing, setEditing] = useState<Row | undefined>(undefined);
  const [shownId, setShownId] = useState<string | undefined>(undefined);
  const q = useRows('parcels');
  if (adding) return <ParcelForm onDone={() => setAdding(false)} />;
  if (editing) return <ParcelForm existing={editing} onDone={() => setEditing(undefined)} />;
  const shown = q.rows?.find((r) => r.id === shownId);   // read fresh from the rows: an edit shows at once
  if (shown && !editing && !analysing) return <ParcelDetail parcel={shown} readOnly={demo} onBack={() => setShownId(undefined)} onEdit={() => setEditing(shown)} onAnalyses={() => setAnalysing(shown)} />;
  if (analysing) return <Analyses parcel={analysing} readOnly={demo} onBack={() => setAnalysing(undefined)} />;
  const live = q.rows?.filter((r) => !r.deleted_at) ?? [];
  const archive = async (r: Row) => {
    await put(db, 'parcels', archived(r, new Date().toISOString()));
    dataVersion.value++;
    showUndo(t('parcel.archived'), async () => { await put(db, 'parcels', restored(r, new Date().toISOString())); dataVersion.value++; });
  };
  return (
    <section>
      <header class="today-head band"><Title k="parcels.title" /></header>
      {demo ? <p class="muted" data-testid="parcel-demo-note">{t('parcel.demoActive')}</p> : live.length > 0 && <button class="btn" data-testid="parcel-add" onClick={() => setAdding(true)}>{t('parcel.add')}</button>}
      <Status q={{ ...q, rows: q.rows && live.length === 0 ? [] : q.rows }} message={t('list.empty')} action={demo ? undefined : { label: t('parcel.add'), run: () => setAdding(true) }} />
      {live.map((r) => (
        <div class="card" key={r.id}>
          <button class="row" data-testid="parcel-open" onClick={() => setShownId(String(r.id))}><span>{String(r.name)}{typeof r.area_str !== 'undefined' && <small>{formatArea(r.area_str as number | string)}</small>}</span><span aria-hidden="true" class="chev" /></button>
          <UnsyncedMark id={r.id} />
          {!demo && <button class="btn quiet" onClick={() => void archive(r)}>{t('parcel.archive')}</button>}
        </div>
      ))}
    </section>
  );
}
