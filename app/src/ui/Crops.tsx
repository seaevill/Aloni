import { useState } from 'preact/hooks';
import { useBack } from './backstack';
import { activeFarm, dataVersion, db, loadDemo, realFarmId } from '../db';
import { t } from '../i18n';
import { formatArea, formatQty } from '../i18n/format';
import { formatDate } from '../i18n';
import { plantingWait } from '../summary/wait';
import { waitLine } from './waitLine';
import { instantOf } from '../spray/time';
import { archived, restored } from '../parcels/parcel'; // generic: set / clear deleted_at
import { validDate } from '../plantings/planting';
import { put } from '../repo';
import type { Row } from '../db/schema';
import { SeasonCalendar } from './SeasonCalendar';
import { CropDetail } from './CropDetail';
import { Chip, CropIcon, PageHead, type Tone } from './ds';
import { EditTrail } from './EditTrail';
import { PlantingForm, STATUS_KEYS } from './PlantingForm';
import { tab } from './nav';
import { nameOf, Status } from './screens';
import { EmptyState, UnsyncedMark } from './states';
import { showUndo } from './Toast';
import { useRows } from './useRows';
import { matchesRecord, RecordSearch } from './cx/RecordSearch';
import './crops-v2.css';

const dot = (...xs: string[]): string => xs.filter(Boolean).join(' · ');
const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const statusText = (v: unknown): string => {
  const key = typeof v === 'string' ? (STATUS_KEYS as Record<string, (typeof STATUS_KEYS)[keyof typeof STATUS_KEYS]>)[v] : undefined;
  return key ? t(key) : t('value.unknown'); // the prototype's own words («harvesting») never leak to the screen
};

/** Crops in use, each with its plantings (parcel · area · sowing date · status). Adding is only for the real farm. */
export function Crops() {
  const [calendar, setCalendar] = useState(false);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false); const [editing, setEditing] = useState<Row | undefined>(undefined); const [shownId, setShownId] = useState<string | undefined>(undefined);
  const crops = useRows('crops');
  const plantings = useRows('plantings');
  const parcels = useRows('parcels');
  const links = useRows('job_plantings'); const sprays = useRows('job_spray'); const labels = useRows('label_uses');
  const liveParcels = parcels.rows?.filter((p) => !p.deleted_at) ?? [];
  useBack(calendar || adding || !!editing || !!shownId, () => { setCalendar(false); setAdding(false); setEditing(undefined); setShownId(undefined); }, adding || !!editing);
  if (calendar) return <SeasonCalendar onBack={() => setCalendar(false)} />;
  if (adding) return <PlantingForm parcels={liveParcels} onDone={() => setAdding(false)} />;
  if (editing) return <PlantingForm parcels={liveParcels} existing={editing} onDone={() => setEditing(undefined)} />;
  const shownCrop = crops.rows?.find((c0) => c0.id === shownId);
  const demo = activeFarm.value !== realFarmId.value;
  const live = plantings.rows?.filter((p) => !p.deleted_at) ?? [];
  const parcelName = (id: unknown) => { const p = parcels.rows?.find((r) => r.id === id); return p ? String(p.name) : t('value.unknown'); };
  const archive = async (r: Row) => {
    await put(db, 'plantings', archived(r, new Date().toISOString()));
    dataVersion.value++;
    showUndo(t('planting.archived'), async () => { await put(db, 'plantings', restored(r, new Date().toISOString())); dataVersion.value++; });
  };
  const sown = (r: Row) => { const d = text(r.sown_on) || text(r.sown); return validDate(d) ? formatDate(d) : t('value.unknown'); };
  const now = instantOf(new Date()) ?? '';
  const canAdd = !demo && liveParcels.length > 0;
  const waitOf = (p: Row) => plantingWait(String(p.id), now, links.rows ?? [], sprays.rows ?? [], plantings.rows ?? [], labels.rows ?? []);
  /** ONE chip per crop: no planting, an unknown waiting period, a running one, or ready to cut (the worst case wins; unknown is never «ready»). */
  const chipOf = (c: Row): { tone: Tone; key: 'ui.crops.chip.none' | 'ui.crops.chip.unknown' | 'ui.crops.chip.wait' | 'ui.crops.chip.free' } => {
    const ws = live.filter((p) => p.crop_id === c.id).map(waitOf);
    if (ws.length === 0) return { tone: 'info', key: 'ui.crops.chip.none' };
    if (ws.some((w) => w.state === 'unknown')) return { tone: 'unknown', key: 'ui.crops.chip.unknown' };
    if (ws.some((w) => w.state === 'running')) return { tone: 'hold', key: 'ui.crops.chip.wait' };
    return { tone: 'ready', key: 'ui.crops.chip.free' };
  };
  if (shownCrop) {
    const mineOf = live.filter((p) => p.crop_id === shownCrop.id);
    return (
      <>
        <CropDetail crop={shownCrop} onBack={() => setShownId(undefined)} />
        <section class="crop-plantings" data-testid="crop-plantings">
          <h2>{t('ui.crops.plantings')}</h2>
          {mineOf.map((p) => (
            <div class="line" key={p.id} data-testid="planting">
              <span>{dot(parcelName(p.parcel_id), formatArea(p.area_str as string | number))}</span>
              <small>{dot(sown(p), statusText(p.status), text(p.variety), text(p.lot_label))}</small>
              <small data-testid="planting-wait">{waitLine(waitOf(p))}</small>
              <UnsyncedMark id={p.id} />
              {!demo && <button class="row" data-testid="planting-edit" onClick={() => setEditing(p)}><span>{t('edit.open')}</span><span aria-hidden="true" class="chev" /></button>}
              <EditTrail row={p} />
              {!demo && <button class="btn quiet" onClick={() => void archive(p)}>{t('planting.archive')}</button>}
            </div>
          ))}
        </section>
      </>
    );
  }
  // Only crops that are really planted are listed (label details for a crop do not make it «grown»); the demo shows its whole list.
  const shown = demo ? crops.rows : crops.rows?.filter((c) => live.some((p) => p.crop_id === c.id));
  const filtered = shown?.filter((r) => matchesRecord(query, nameOf(r)));
  const calendarButton = <button type="button" class="btn secondary" data-testid="season-calendar-open"
    onClick={() => setCalendar(true)}>{t('ui.seasonCalendar.title')}</button>;
  if (!demo && parcels.rows && crops.rows && liveParcels.length === 0) {
    return (
      <section aria-label={t('crops.title')}>
        <PageHead heading={t('ui.tab.crops')} />
        {calendarButton}
        <EmptyState message={t('planting.noParcels')} actionLabel={t('parcel.add')} onAction={() => { tab.value = 'parcels'; }} secondLabel={t('more.loadDemo')} onSecond={() => void loadDemo()} />
      </section>
    );
  }
  return (
    <section aria-label={t('crops.title')}>
      <PageHead heading={t('ui.tab.crops')} />
      {demo && <p class="muted" data-testid="planting-demo-note">{t('planting.demoActive')}</p>}
      {canAdd && live.length > 0 && <button class="btn" data-testid="planting-add" onClick={() => setAdding(true)}>{t('planting.add')}</button>}
      <Status q={{ ...crops, rows: shown && shown.length === 0 ? [] : shown ?? null }} message={t('list.empty')}
        action={canAdd ? { label: t('planting.add'), run: () => setAdding(true) } : undefined} />
      {shown && <div class="season-list-tools">
        {shown.length > 0 && <RecordSearch query={query} onQuery={setQuery} empty={filtered?.length === 0} />}
        {calendarButton}
      </div>}
      {filtered?.map((c) => {
        const chip = chipOf(c);
        return <div class="card crop-card" key={c.id}>
          <button class="row crop-open crop-tile" data-testid="crop-open" onClick={() => setShownId(String(c.id))}>
            <span class="crop-list-tile"><CropIcon slug={text(c.slug)} size="calc(var(--tile) - var(--sp-8))" /></span>
            <span class="crop-tile-name"><strong>{nameOf(c)}</strong><Chip tone={chip.tone}>{t(chip.key)}</Chip></span>
            <span aria-hidden="true" class="chev" />
          </button>
        </div>;
      })}
    </section>
  );
}
