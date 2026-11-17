import { useState } from 'preact/hooks';
import { activeFarm, dataVersion, db, realFarmId } from '../db';
import { t } from '../i18n';
import { formatArea } from '../i18n/format';
import { formatDate } from '../i18n';
import { archived, restored } from '../parcels/parcel'; // generic: set / clear deleted_at
import { validDate } from '../plantings/planting';
import { put } from '../repo';
import type { Row } from '../db/schema';
import { PlantingForm, STATUS_KEYS } from './PlantingForm';
import { nameOf, Status, Title } from './screens';
import { UnsyncedMark } from './states';
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
  const [adding, setAdding] = useState(false);
  const crops = useRows('crops');
  const plantings = useRows('plantings');
  const parcels = useRows('parcels');
  const liveParcels = parcels.rows?.filter((p) => !p.deleted_at) ?? [];
  if (adding) return <PlantingForm parcels={liveParcels} onDone={() => setAdding(false)} />;
  const demo = activeFarm.value !== realFarmId.value;
  const live = plantings.rows?.filter((p) => !p.deleted_at) ?? [];
  const parcelName = (id: unknown) => { const p = parcels.rows?.find((r) => r.id === id); return p ? String(p.name) : t('value.unknown'); };
  const archive = async (r: Row) => {
    await put(db, 'plantings', archived(r, new Date().toISOString()));
    dataVersion.value++;
    showUndo(t('planting.archived'), async () => { await put(db, 'plantings', restored(r, new Date().toISOString())); dataVersion.value++; });
  };
  const sown = (r: Row) => { const d = text(r.sown_on) || text(r.sown); return validDate(d) ? formatDate(d) : t('value.unknown'); };
  const canAdd = !demo && liveParcels.length > 0;
  return (
    <section>
      <Title k="crops.title" />
      {demo ? <p class="muted" data-testid="planting-demo-note">{t('planting.demoActive')}</p>
        : !liveParcels.length && crops.rows !== null && <p class="muted" data-testid="planting-need-parcel">{t('planting.noParcels')}</p>}
      {canAdd && live.length > 0 && <button class="btn" data-testid="planting-add" onClick={() => setAdding(true)}>{t('planting.add')}</button>}
      <Status q={{ ...crops, rows: crops.rows && crops.rows.length === 0 && canAdd ? [] : crops.rows }} message={t('list.empty')}
        action={canAdd ? { label: t('planting.add'), run: () => setAdding(true) } : undefined} />
      {crops.rows?.map((c) => (
        <div class="card" key={c.id}>{nameOf(c)}{typeof c.latin === 'string' && <small>{c.latin}</small>}<UnsyncedMark id={c.id} />
          {live.filter((p) => p.crop_id === c.id).map((p) => (
            <div class="line" key={p.id} data-testid="planting">
              <span>{dot(parcelName(p.parcel_id), formatArea(p.area_str as string | number))}</span>
              <small>{dot(sown(p), statusText(p.status), text(p.variety), text(p.lot_label))}</small>
              <UnsyncedMark id={p.id} />
              {!demo && <button class="btn secondary" onClick={() => void archive(p)}>{t('planting.archive')}</button>}
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
