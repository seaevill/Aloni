import { useRef, useState } from 'preact/hooks';
import { useSubmit } from './useSubmit';
import { dataVersion, db, realFarmId } from '../db';
import { t, type I18nKey } from '../i18n';
import { storePhoto } from '../media/photo';
import { archived } from '../parcels/parcel';
import { buildProduct, TYPES, UNITS, type ProductType, type ProductUnit } from '../products/product';
import { put } from '../repo';
import { MediaThumb } from './Photos';
import { showUndo } from './Toast';

export const TYPE_KEYS: Record<ProductType, I18nKey> = {
  fungicide: 'product.type.fungicide', insecticide: 'product.type.insecticide', herbicide: 'product.type.herbicide', fertiliser: 'product.type.fertiliser', other: 'product.type.other',
};
const UNIT_KEYS: Record<ProductUnit, I18nKey> = { L: 'product.unit.l', kg: 'product.unit.kg' };

/** Add a product: name as printed, type and unit (both chosen), optional registration number and label photo (stays on the phone). Offline, saves at once. */
export function ProductForm({ onDone }: { onDone: () => void }) {
  const { busy, submit } = useSubmit();
  const [name, setName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [type, setType] = useState<ProductType | undefined>(undefined);
  const [unit, setUnit] = useState<ProductUnit | undefined>(undefined);
  const [photoId, setPhotoId] = useState<string | undefined>(undefined);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [errors, setErrors] = useState({ name: false, type: false, unit: false });
  const file = useRef<HTMLInputElement>(null);

  const pick = async (e: Event) => {
    const el = e.target as HTMLInputElement;
    const f = el.files?.[0];
    el.value = '';
    if (!f) return;
    const r = await storePhoto(db, realFarmId.value, f, new Date().toISOString());
    setPhotoFailed(r.result === 'error');
    if (r.id) setPhotoId(r.id);
  };
  const save = async () => {
    const r = buildProduct({ name, regNo, type, unit, photoId }, realFarmId.value, new Date().toISOString(), crypto.randomUUID());
    if (!r.ok) { setErrors({ name: r.name, type: r.type, unit: r.unit }); return; }
    await put(db, 'products', r.row, 'insert');
    dataVersion.value++;
    showUndo(t('product.saved'), async () => { await put(db, 'products', archived(r.row, new Date().toISOString())); dataVersion.value++; }, { where: true });
    onDone();
  };

  return (
    <section>
      <h1>{t('product.add')}</h1>
      <label class="field">{t('product.name')}
        <input class="input" value={name} autoComplete="off" onInput={(e) => setName((e.target as HTMLInputElement).value)} />
      </label>
      {errors.name && <p class="msg error" role="alert">{t('product.error.name')}</p>}
      <label class="field">{t('product.regNo')}
        <input class="input" value={regNo} autoComplete="off" onInput={(e) => setRegNo((e.target as HTMLInputElement).value)} />
      </label>

      <h2>{t('product.type.title')}</h2>
      <div class="seg two">
        {TYPES.map((k) => <button key={k} aria-pressed={type === k} onClick={() => setType(k)}>{t(TYPE_KEYS[k])}</button>)}
      </div>
      {errors.type && <p class="msg error" role="alert">{t('product.error.type')}</p>}

      <h2>{t('product.unit.title')}</h2>
      <div class="seg two">
        {UNITS.map((k) => <button key={k} aria-pressed={unit === k} onClick={() => setUnit(k)}>{t(UNIT_KEYS[k])}</button>)}
      </div>
      {errors.unit && <p class="msg error" role="alert">{t('product.error.unit')}</p>}

      <input ref={file} type="file" accept="image/*" hidden aria-hidden="true" tabIndex={-1} onChange={(e) => void pick(e)} />
      <button class="btn secondary" data-testid="product-photo" onClick={() => file.current?.click()}>{t('product.photo')}</button>
      {photoId && <div class="photos"><MediaThumb id={photoId} /></div>}
      {photoFailed && <p class="msg error" role="alert">{t('photos.error')}</p>}

      <button class="btn" data-testid="product-save" onClick={() => void submit(save)} disabled={busy}>{t('product.save')}</button>
      <button class="btn secondary" onClick={onDone}>{t('product.cancel')}</button>
    </section>
  );
}
