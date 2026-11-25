import { useState } from 'preact/hooks';
import { dataVersion, db, realFarmId } from '../db';
import { CATALOG, cropRow, cropName } from '../crops/catalog';
import { lang, t, type I18nKey } from '../i18n';
import { validBoundary } from '../map/geo';
import { PlantingSketchDraw } from './PlantingSketchDraw';
import { formatArea } from '../i18n/format';
import { archived } from '../parcels/parcel';
import { athensToday, buildPlanting, exceedsParcel, STATUSES, type PlantingErrors, type Status } from '../plantings/planting';
import { put, putMany } from '../repo';
import { useSubmit } from './useSubmit';
import type { Row } from '../db/schema';
import { showUndo } from './Toast';
import { applyEdit, commaText } from '../records/edits';

export const STATUS_KEYS: Record<Status, I18nKey> = {
  planned: 'planting.status.planned', growing: 'planting.status.growing', harvesting: 'planting.status.harvesting', finished: 'planting.status.finished',
};
const NO_ERRORS: PlantingErrors = { parcel: false, crop: false, area: undefined, date: false };

/** Add a planting: parcel, crop chip, area, sowing date (today unless changed), status. Offline, saves at once. A too-large area only warns. */
export function PlantingForm({ parcels, onDone, existing }: { parcels: Row[]; onDone: () => void; existing?: Row }) {
  const { busy, submit } = useSubmit();
  const [parcelId, setParcelId] = useState(typeof existing?.parcel_id === 'string' ? existing.parcel_id : parcels.length === 1 ? String(parcels[0].id) : '');
  const [why, setWhy] = useState(''); const [whyMissing, setWhyMissing] = useState(false);
  const [slug, setSlug] = useState('');
  const [variety, setVariety] = useState(typeof existing?.variety === 'string' ? existing.variety : '');
  const [lot, setLot] = useState(typeof existing?.lot_label === 'string' ? existing.lot_label : '');
  const [area, setArea] = useState(commaText(existing?.area_str));
  const [sownOn, setSownOn] = useState(typeof existing?.sown_on === 'string' ? existing.sown_on : athensToday(new Date()) ?? '');
  const [status, setStatus] = useState<Status>(STATUSES.find((x) => x === existing?.status) ?? 'growing');
  const [errors, setErrors] = useState<PlantingErrors>(NO_ERRORS);

  const parcel = parcels.find((p) => p.id === parcelId);
  const bigger = parcel !== undefined && exceedsParcel(area, parcel.area_str);
  const titleKey: I18nKey = existing ? 'edit.title' : 'planting.add';
  const save = async () => {
    const crop = CATALOG.find((c) => c.slug === slug);
    const now = new Date().toISOString();
    const cropRowValue = crop ? await cropRow(crop, realFarmId.value, now) : undefined;
    const r = buildPlanting({ parcelId, cropId: existing ? String(existing.crop_id) : cropRowValue?.id ?? '', variety, lot, area, sownOn, status }, realFarmId.value, now, crypto.randomUUID());
    if (!r.ok) { setErrors({ parcel: r.parcel, crop: r.crop, area: r.area, date: r.date }); return; }
    if (existing) { // append-only: the planting keeps the new values, `edits` the previous ones with the reason (the parcel and the crop never change: a different one is a new planting)
      const e = applyEdit(existing, { area_str: r.row.area_str, sown_on: r.row.sown_on, status: r.row.status, variety: r.row.variety, lot_label: r.row.lot_label }, why, now);
      if (e.kind === 'nochange') { onDone(); return; }
      if (e.kind === 'reason') { setWhyMissing(true); return; }
      await put(db, 'plantings', e.row, 'update');
      dataVersion.value++;
      onDone();
      return;
    }
    const newCrop = cropRowValue && !(await db.crops.get(cropRowValue.id)) ? [{ table: 'crops', row: cropRowValue, op: 'insert' as const }] : [];
    await putMany(db, [...newCrop, { table: 'plantings', row: r.row, op: 'insert' }]);
    dataVersion.value++;
    showUndo(t('planting.saved'), async () => { await put(db, 'plantings', archived(r.row, new Date().toISOString())); dataVersion.value++; }, { where: true });
    onDone();
  };

  return (
    <section>
      <h1>{t(titleKey)}</h1>
      {/* TODO(B2): Preview only until planting geometry is persisted. Never replaces typed area. */}
      {import.meta.env.DEV && import.meta.env.VITE_DS_GALLERY === 'true' && validBoundary(parcel?.boundary) && <PlantingSketchDraw key={parcelId} parcel={parcel.boundary} />}
      {existing && <p class="muted">{t('edit.note')}</p>}
      {!existing && <>
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
      </>}

      <label class="field">{t('planting.area')}
        <span class="inbox"><input class="input" value={area} inputMode="decimal" autoComplete="off" onInput={(e) => setArea((e.target as HTMLInputElement).value)} /><span class="unit">{t('unit.str')}</span></span>
      </label>
      {errors.area === 'missing' && <p class="msg error" role="alert">{t('parcel.error.area.missing')}</p>}
      {errors.area === 'invalid' && <p class="msg error" role="alert">{t('parcel.error.area.invalid')}</p>}
      {errors.area === 'implausible' && <p class="msg error" role="alert">{t('parcel.error.area.big')}</p>}
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

      {existing && <label class="field">{t('edit.reason')}<input class="input" value={why} autoComplete="off" data-testid="edit-reason" onInput={(e) => setWhy((e.target as HTMLInputElement).value)} /></label>}
      {whyMissing && why.trim() === '' && <p class="msg error" role="alert" data-testid="edit-reason-error">{t('edit.reason.error')}</p>}
      <button class="btn" data-testid="planting-save" onClick={() => void submit(save)} disabled={busy}>{t('planting.save')}</button>
      <button class="btn secondary" onClick={onDone}>{t('planting.cancel')}</button>
    </section>
  );
}
