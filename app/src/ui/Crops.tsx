import { useState } from 'preact/hooks';
import { useBack } from './backstack';
import { activeFarm, dataVersion, db, loadDemo, realFarmId } from '../db';
import { t } from '../i18n';
import { formatArea } from '../i18n/format';
import { formatDate } from '../i18n';
import { plantingWait } from '../summary/wait';
import { waitLine } from './waitLine';
import { instantOf } from '../spray/time';
import { archived, restored } from '../parcels/parcel'; // generic: set / clear deleted_at
import { validDate } from '../plantings/planting';
import { put } from '../repo';
import type { Row } from '../db/schema';
import { CropDetail } from './CropDetail';
import { EditTrail } from './EditTrail';
import { PlantingForm, STATUS_KEYS } from './PlantingForm';
import { tab } from './nav';
import { nameOf, Status, Title } from './screens';
import { EmptyState, UnsyncedMark } from './states';
import { showUndo } from './Toast';
import { useRows } from './useRows';

const dot = (...xs: string[]): string => xs.filter(Boolean).join(' · ');
const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const statusText = (v: unknown): string => {
  const key = typeof v === 'string' ? (STATUS_KEYS as Record<string, (typeof STATUS_KEYS)[keyof typeof STATUS_KEYS]>)[v] : undefined;
  return key ? t(key) : t('value.unknown'); // the prototype's own words («harvesting») never leak to the screen
};

/** Crops in use, each with its plantings (parcel · area · sowing date · status). Adding is only for the real farm. */
export function Crops() {
  const [adding, setAdding] = useState(false); const [editing, setEditing] = useState<Row | undefined>(undefined); const [shownId, setShownId] = useState<string | undefined>(undefined);
  const crops = useRows('crops');
  const plantings = useRows('plantings');
  const parcels = useRows('parcels');
  const links = useRows('job_plantings'); const sprays = useRows('job_spray'); const labels = useRows('label_uses');
  const liveParcels = parcels.rows?.filter((p) => !p.deleted_at) ?? [];
  useBack(adding || !!editing || !!shownId, () => { setAdding(false); setEditing(undefined); setShownId(undefined); }, adding || !!editing);
  if (adding) return <PlantingForm parcels={liveParcels} onDone={() => setAdding(false)} />;
  if (editing) return <PlantingForm parcels={liveParcels} existing={editing} onDone={() => setEditing(undefined)} />;
  const shownCrop = crops.rows?.find((c0) => c0.id === shownId);
  if (shownCrop) return <CropDetail crop={shownCrop} onBack={() => setShownId(undefined)} />;
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
  // Only crops that are really planted are listed (label details for a crop do not make it «grown»); the demo shows its whole list.
  const shown = demo ? crops.rows : crops.rows?.filter((c) => live.some((p) => p.crop_id === c.id));
  if (!demo && parcels.rows && crops.rows && liveParcels.length === 0) {
    return (
      <section>
        <header class="today-head band"><Title k="crops.title" /></header>
        <EmptyState message={t('planting.noParcels')} actionLabel={t('parcel.add')} onAction={() => { tab.value = 'parcels'; }} secondLabel={t('more.loadDemo')} onSecond={() => void loadDemo()} />
      </section>
    );
  }
  return (
    <section>
      <header class="today-head band"><Title k="crops.title" /></header>
      {demo && <p class="muted" data-testid="planting-demo-note">{t('planting.demoActive')}</p>}
      {canAdd && live.length > 0 && <button class="btn" data-testid="planting-add" onClick={() => setAdding(true)}>{t('planting.add')}</button>}
      <Status q={{ ...crops, rows: shown && shown.length === 0 ? [] : shown ?? null }} message={t('list.empty')}
        action={canAdd ? { label: t('planting.add'), run: () => setAdding(true) } : undefined} />
      {shown?.map((c) => (
        <div class="card" key={c.id}>
          <button class="row" data-testid="crop-open" onClick={() => setShownId(String(c.id))}><span>{nameOf(c)}{typeof c.latin === 'string' && <small>{c.latin}</small>}</span><span aria-hidden="true" class="chev" /></button><UnsyncedMark id={c.id} />
          {live.filter((p) => p.crop_id === c.id).map((p) => (
            <div class="line" key={p.id} data-testid="planting">
              <span>{dot(parcelName(p.parcel_id), formatArea(p.area_str as string | number))}</span>
              <small>{dot(sown(p), statusText(p.status), text(p.variety), text(p.lot_label))}</small>
              <small data-testid="planting-wait">{waitLine(plantingWait(String(p.id), now, links.rows ?? [], sprays.rows ?? [], plantings.rows ?? [], labels.rows ?? []))}</small>
              <UnsyncedMark id={p.id} />
              {!demo && <button class="row" data-testid="planting-edit" onClick={() => setEditing(p)}><span>{t('edit.open')}</span><span aria-hidden="true" class="chev" /></button>}
              <EditTrail row={p} />
              {!demo && <button class="btn quiet" onClick={() => void archive(p)}>{t('planting.archive')}</button>}
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
