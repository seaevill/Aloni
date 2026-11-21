import { useEffect, useState } from 'preact/hooks';
import { openParcelForm } from './nav';
import { useBack } from './backstack';
import { activeFarm, dataVersion, db, loadDemo, realFarmId } from '../db';
import { tab } from './nav';
import { DEMO_FARM_ID } from '../config';
import { lang, t, type I18nKey } from '../i18n';
import { CATALOG, cropName } from '../crops/catalog';
import { formatArea, formatQty } from '../i18n/format';
import { archived, restored } from '../parcels/parcel';
import { put } from '../repo';
import { Analyses } from './Analyses';
import { parcelWait } from '../summary/wait';
import { instantOf } from '../spray/time';
import { waitLine } from './waitLine';
import { EditTrail } from './EditTrail';
import { ParcelForm } from './ParcelForm';
import { ParcelSketch } from './ParcelSketch';
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
  const plantings = useRows('plantings'); const links = useRows('job_plantings'); const sprays = useRows('job_spray'); const labels = useRows('label_uses');
  useBack(adding || !!analysing || !!editing || !!shownId, () => { setAdding(false); setAnalysing(undefined); setEditing(undefined); setShownId(undefined); }, adding || !!editing);
  useEffect(() => { if (openParcelForm.value) { openParcelForm.value = false; setAdding(true); } }, [openParcelForm.value]);
  if (adding) return <ParcelForm onDone={() => setAdding(false)} />;
  if (editing) return <ParcelForm existing={editing} onDone={() => setEditing(undefined)} />;
  const shown = q.rows?.find((r) => r.id === shownId);   // read fresh from the rows: an edit shows at once
  if (shown && !editing && !analysing) return <ParcelDetail parcel={shown} readOnly={demo} onBack={() => setShownId(undefined)} onEdit={() => setEditing(shown)} onAnalyses={() => setAnalysing(shown)} />;
  if (analysing) return <Analyses parcel={analysing} readOnly={demo} onBack={() => setAnalysing(undefined)} />;
  const live = q.rows?.filter((r) => !r.deleted_at) ?? [];
  const now = instantOf(new Date()) ?? '';
  const waitFor = (r: Row) => {
    if (!plantings.rows || !links.rows || !sprays.rows || !labels.rows) return { state: 'unknown', lastSprayAt: undefined } as const;
    return parcelWait(r.id, now, plantings.rows, links.rows, sprays.rows, labels.rows);
  };
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
      {live.length > 0 && <section aria-label={t('detail.sketch')} data-testid="parcel-sketch-overview">
        <h2>{t('detail.sketch')}</h2>
        <div class="parcel-sketch-grid">
          {live.map((r) => {
            const wait = waitFor(r);
            const name = String(r.name);
            return <button type="button" class="parcel-sketch-tile" key={r.id} data-testid="parcel-sketch-open" data-wait={wait.state} onClick={() => setShownId(r.id)}>
              <ParcelSketch boundary={r.boundary} sample={demo ? r.sketch : undefined} decorative />
              <strong>{name}</strong>
              <small data-testid="parcel-sketch-status">{waitLine(wait)}</small>
            </button>;
          })}
        </div>
      </section>}
      {live.map((r) => (
        <div class="card" key={r.id}>
          <button class="row" data-testid="parcel-open" onClick={() => setShownId(String(r.id))}><span>{String(r.name)}{typeof r.area_str !== 'undefined' && <small>{formatArea(r.area_str as number | string)}</small>}</span><span aria-hidden="true" class="chev" /></button>
          <small data-testid="parcel-wait">{waitLine(waitFor(r))}</small>
          <UnsyncedMark id={r.id} />
          {!demo && <button class="btn quiet" onClick={() => void archive(r)}>{t('parcel.archive')}</button>}
        </div>
      ))}
    </section>
  );
}
