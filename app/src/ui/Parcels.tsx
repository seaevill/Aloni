import { ParcelSketch } from './ParcelSketch';
import { useEffect, useState } from 'preact/hooks';
import { openParcelForm } from './nav';
import { useBack } from './backstack';
import { activeFarm, dataVersion, db, realFarmId } from '../db';
import { t } from '../i18n';
import { formatArea } from '../i18n/format';
import { archived, restored } from '../parcels/parcel';
import { put } from '../repo';
import { Analyses } from './Analyses';
import { parcelWait } from '../summary/wait';
import { instantOf } from '../spray/time';
import { waitLine } from './waitLine';
import { EditTrail } from './EditTrail';
import { ParcelForm } from './ParcelForm';
import { ParcelDetail } from './ParcelDetail';
import { UnsyncedMark } from './states';
import { showUndo } from './Toast';
import type { Row } from '../db/schema';
import { useRows } from './useRows';
import { matchesRecord, RecordSearch } from './cx/RecordSearch';
import { Status, Title } from './screens';

export function Parcels() {
  const [query, setQuery] = useState('');
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
  const filtered = live.filter((r) => matchesRecord(query, String(r.name)));
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
            const wait = parcelWait(String(r.id), instantOf(new Date()) ?? '', plantings.rows ?? [], links.rows ?? [], sprays.rows ?? [], labels.rows ?? []);
            return <button type="button" class="parcel-sketch-tile" key={r.id} data-testid="parcel-sketch-open" data-wait={wait.state} onClick={() => setShownId(String(r.id))}>
              <ParcelSketch boundary={r.boundary} sample={demo ? r.sketch : undefined} decorative />
              <strong>{String(r.name)}</strong>
              <small data-testid="parcel-sketch-status">{waitLine(wait)}</small>
            </button>;
          })}
        </div>
      </section>}
      {live.length > 0 && <RecordSearch query={query} onQuery={setQuery} empty={filtered.length === 0} />}
      {filtered.map((r) => (
        <div class="card" key={r.id}>
          <button class="row" data-testid="parcel-open" onClick={() => setShownId(String(r.id))}><span>{String(r.name)}{typeof r.area_str !== 'undefined' && <small>{formatArea(r.area_str as number | string)}</small>}</span><span aria-hidden="true" class="chev" /></button>
          <small data-testid="parcel-wait">{waitLine(parcelWait(String(r.id), instantOf(new Date()) ?? '', plantings.rows ?? [], links.rows ?? [], sprays.rows ?? [], labels.rows ?? []))}</small>
          <UnsyncedMark id={r.id} />
          {!demo && <button class="btn quiet" onClick={() => void archive(r)}>{t('parcel.archive')}</button>}
        </div>
      ))}
    </section>
  );
}
