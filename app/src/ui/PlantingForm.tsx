import { useState } from 'preact/hooks';
import { dataVersion, db, realFarmId } from '../db';
import { CATALOG, cropRow, cropName } from '../crops/catalog';
import { lang, t, type I18nKey } from '../i18n';
import { formatArea } from '../i18n/format';
import { archived } from '../parcels/parcel';
import { athensToday, buildPlanting, exceedsParcel, STATUSES, type PlantingErrors, type Status } from '../plantings/planting';
import { put, putMany } from '../repo';
import type { Row } from '../db/schema';
import { showUndo } from './Toast';

export const STATUS_KEYS: Record<Status, I18nKey> = {
  planned: 'planting.status.planned', growing: 'planting.status.growing', harvesting: 'planting.status.harvesting', finished: 'planting.status.finished',
};
const NO_ERRORS: PlantingErrors = { parcel: false, crop: false, area: undefined, date: false };

/** Add a planting: parcel, crop chip, area, sowing date (today unless changed), status. Offline, saves at once. A too-large area only warns. */
export function PlantingForm({ parcels, onDone }: { parcels: Row[]; onDone: () => void }) {
  const [parcelId, setParcelId] = useState('');
  const [slug, setSlug] = useState('');
  const [variety, setVariety] = useState('');
  const [lot, setLot] = useState('');
  const [area, setArea] = useState('');
  const [sownOn, setSownOn] = useState(athensToday(new Date()) ?? '');
  const [status, setStatus] = useState<Status>('growing');
  const [errors, setErrors] = useState<PlantingErrors>(NO_ERRORS);

  const parcel = parcels.find((p) => p.id === parcelId);
  const bigger = parcel !== undefined && exceedsParcel(area, parcel.area_str);
  const save = async () => {
    const crop = CATALOG.find((c) => c.slug === slug);
    const now = new Date().toISOString();
    const cropRowValue = crop ? await cropRow(crop, realFarmId.value, now) : undefined;
    const r = buildPlanting({ parcelId, cropId: cropRowValue?.id ?? '', variety, lot, area, sownOn, status }, realFarmId.value, now, crypto.randomUUID());
    if (!r.ok) { setErrors({ parcel: r.parcel, crop: r.crop, area: r.area, date: r.date }); return; }
    const newCrop = cropRowValue && !(await db.crops.get(cropRowValue.id)) ? [{ table: 'crops', row: cropRowValue, op: 'insert' as const }] : [];
    await putMany(db, [...newCrop, { table: 'plantings', row: r.row, op: 'insert' }]);
    dataVersion.value++;
    showUndo(t('planting.saved'), async () => { await put(db, 'plantings', archived(r.row, new Date().toISOString())); dataVersion.value++; });
    onDone();
  };

  return (
    <section>
      <h1>{t('planting.add')}</h1>
      <h2>{t('planting.parcel')}</h2>
      <div class="seg two">
        {parcels.map((p) => <button key={p.id} aria-pressed={parcelId === p.id} onClick={() => setParcelId(p.id)}>{String(p.name)}</button>)}
      </div>
      {errors.parcel && <p class="msg error" role="alert">{t('planting.error.parcel')}</p>}

      <h2>{t('planting.crop')}</h2>
      <div class="seg two">
        {CATALOG.map((c) => <button key={c.slug} aria-pressed={slug === c.slug} onClick={() => setSlug(c.slug)}>{cropName(c, lang.value)}</button>)}
      </div>
      {errors.crop && <p class="msg error" role="alert">{t('planting.error.crop')}</p>}

      <label class="field">{t('planting.area')}
        <input class="input" value={area} inputMode="decimal" autoComplete="off" onInput={(e) => setArea((e.target as HTMLInputElement).value)} />
      </label>
      {errors.area === 'missing' && <p class="msg error" role="alert">{t('parcel.error.area.missing')}</p>}
      {errors.area === 'invalid' && <p class="msg error" role="alert">{t('parcel.error.area.invalid')}</p>}
      {bigger && <p class="msg warn" role="status" data-testid="planting-warn">{t('planting.warn.bigger', { parcel: formatArea(parcel.area_str as string | number) })}</p>}

      <label class="field">{t('planting.sown')}
        <input class="input" type="date" value={sownOn} onInput={(e) => setSownOn((e.target as HTMLInputElement).value)} />
      </label>
      {errors.date && <p class="msg error" role="alert">{t('planting.error.date')}</p>}

      <h2>{t('planting.status.title')}</h2>
      <div class="seg two">
        {STATUSES.map((s) => <button key={s} aria-pressed={status === s} onClick={() => setStatus(s)}>{t(STATUS_KEYS[s])}</button>)}
      </div>

      <label class="field">{t('planting.variety')}
        <input class="input" value={variety} autoComplete="off" onInput={(e) => setVariety((e.target as HTMLInputElement).value)} />
      </label>
      <label class="field">{t('planting.lot')}
        <input class="input" value={lot} autoComplete="off" onInput={(e) => setLot((e.target as HTMLInputElement).value)} />
      </label>

      <button class="btn" data-testid="planting-save" onClick={() => void save()}>{t('planting.save')}</button>
      <button class="btn secondary" onClick={onDone}>{t('planting.cancel')}</button>
    </section>
  );
}
