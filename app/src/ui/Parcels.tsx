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
import { nameOf, Status, Title } from './screens';
import type { I18nKey } from '../i18n';
import { Chip } from './ds';

export function Parcels() {
  const [query, setQuery] = useState('');
  const demo = activeFarm.value !== realFarmId.value;
  const [adding, setAdding] = useState(false);
  const [analysing, setAnalysing] = useState<Row | undefined>(undefined);
  const [editing, setEditing] = useState<Row | undefined>(undefined);
  const [shownId, setShownId] = useState<string | undefined>(undefined);
  const q = useRows('parcels');
  const plantings = useRows('plantings'); const crops = useRows('crops'); const links = useRows('job_plantings'); const sprays = useRows('job_spray'); const labels = useRows('label_uses');
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
      {live.length > 0 && <RecordSearch query={query} onQuery={setQuery} empty={filtered.length === 0} />}
      {filtered.map((r) => {
        const wait = parcelWait(String(r.id), instantOf(new Date()) ?? '', plantings.rows ?? [], links.rows ?? [], sprays.rows ?? [], labels.rows ?? []);
        const short = SHORT[wait.state];
        const cropLine = cropLineOf(String(r.id), plantings.rows ?? [], crops.rows ?? []);
        return <div class="card" key={r.id}>
          <button class="row parcel-card-open" data-testid="parcel-open" data-wait={wait.state} onClick={() => setShownId(String(r.id))}>
            <ParcelSketch boundary={r.boundary} sample={demo ? r.sketch : undefined} decorative />
            <span class="parcel-card-text"><strong>{String(r.name)}</strong>{typeof r.area_str !== 'undefined' && <small>{formatArea(r.area_str as number | string)}</small>}{cropLine !== '' && <small data-testid="parcel-crops">{cropLine}</small>}<span class="parcel-sketch-state" data-testid="parcel-sketch-status"><Chip tone={short.tone}>{t(short.key)}</Chip></span></span>
            <span aria-hidden="true" class="chev" />
          </button>
          <small data-testid="parcel-wait">{waitLine(wait)}</small>
          <UnsyncedMark id={r.id} />
          {!demo && <button class="btn quiet" onClick={() => void archive(r)}>{t('parcel.archive')}</button>}
        </div>;
      })}
    </section>
  );
}

/** the short state of a field on its sketch tile (the full sentence is on the row below): the same three words the crop chips use */
const SHORT = {
  free: { tone: 'ready', key: 'ui.crops.chip.free' },
  running: { tone: 'hold', key: 'ui.crops.chip.wait' },
  unknown: { tone: 'unknown', key: 'ui.crops.chip.unknown' },
} as const satisfies Record<string, { tone: 'ready' | 'hold' | 'unknown'; key: I18nKey }>;

/** the names of the crops still on a field (unfinished plantings), once each: the card then says what grows there without opening it */
function cropLineOf(parcelId: string, plantings: readonly Row[], crops: readonly Row[]): string {
  const names = plantings.filter((p) => p.parcel_id === parcelId && !p.deleted_at && p.status !== 'finished').map((p) => nameOf(crops.find((c) => c.id === p.crop_id) ?? {})).filter((n) => n !== '');
  return [...new Set(names)].join(', ');
}
