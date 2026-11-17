import { useRef, useState } from 'preact/hooks';
import { dataVersion, db, realFarmId } from '../db';
import { buildAnalysis, EC_UNITS, TABLES, type EcUnit, type Kind } from '../analyses/analysis';
import { t, type I18nKey } from '../i18n';
import { storePhoto } from '../media/photo';
import { archived } from '../parcels/parcel';
import { put } from '../repo';
import type { Row } from '../db/schema';
import { MediaThumb } from './Photos';
import { showUndo } from './Toast';

export const EC_UNIT_KEYS: Record<EcUnit, I18nKey> = { 'dS/m': 'analysis.ecUnit.ds', 'mS/cm': 'analysis.ecUnit.ms', 'uS/cm': 'analysis.ecUnit.us' };
const NONE = { date: false, ph: false, ec: false, ecUnit: false };

/** Add a soil or water analysis for a parcel: date (chosen), optional lab / pH / EC (with the report's unit) / notes / report photo. Offline, saves at once. */
export function AnalysisForm({ parcel, kind, onDone }: { parcel: Row; kind: Kind; onDone: () => void }) {
  const [v, setV] = useState({ sampledOn: '', lab: '', ph: '', ec: '', notes: '' });
  const [ecUnit, setEcUnit] = useState<EcUnit | undefined>(undefined);
  const [photoId, setPhotoId] = useState<string | undefined>(undefined);
  const [bad, setBad] = useState(NONE);
  const file = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof v) => (e: Event) => setV({ ...v, [k]: (e.target as HTMLInputElement).value });
  const pick = async (e: Event) => {
    const el = e.target as HTMLInputElement;
    const f = el.files?.[0];
    el.value = '';
    if (f) setPhotoId((await storePhoto(db, realFarmId.value, f, new Date().toISOString())).id);
  };
  const save = async () => {
    const r = buildAnalysis({ parcelId: parcel.id, ...v, ecUnit, photoId }, realFarmId.value, new Date().toISOString(), crypto.randomUUID());
    if (!r.ok) { setBad({ date: r.date, ph: r.ph, ec: r.ec, ecUnit: r.ecUnit }); return; }
    await put(db, TABLES[kind], r.row, 'insert');
    dataVersion.value++;
    showUndo(t('analysis.saved'), async () => { await put(db, TABLES[kind], archived(r.row, new Date().toISOString())); dataVersion.value++; });
    onDone();
  };
  const titleKey: I18nKey = kind === 'soil' ? 'analysis.add.soil' : 'analysis.add.water';
  return (
    <section>
      <h1>{t(titleKey)}</h1>
      <label class="field">{t('analysis.date')}
        <input class="input" type="date" value={v.sampledOn} onInput={set('sampledOn')} />
      </label>
      {bad.date && <p class="msg error" role="alert">{t('analysis.error.date')}</p>}
      <label class="field">{t('analysis.lab')}
        <input class="input" value={v.lab} autoComplete="off" onInput={set('lab')} />
      </label>
      <label class="field">{t('analysis.ph')}
        <input class="input" value={v.ph} inputMode="decimal" autoComplete="off" onInput={set('ph')} />
      </label>
      {bad.ph && <p class="msg error" role="alert">{t('analysis.error.ph')}</p>}
      <label class="field">{t('analysis.ec')}
        <input class="input" value={v.ec} inputMode="decimal" autoComplete="off" onInput={set('ec')} />
      </label>
      {bad.ec && <p class="msg error" role="alert">{t('analysis.error.ec')}</p>}
      <h2>{t('analysis.ecUnit.title')}</h2>
      <div class="seg">
        {EC_UNITS.map((u) => <button key={u} aria-pressed={ecUnit === u} onClick={() => setEcUnit(u)}>{t(EC_UNIT_KEYS[u])}</button>)}
      </div>
      {bad.ecUnit && <p class="msg error" role="alert">{t('analysis.error.ecUnit')}</p>}
      <label class="field">{t('analysis.notes')}
        <input class="input" value={v.notes} autoComplete="off" onInput={set('notes')} />
      </label>
      <input ref={file} type="file" accept="image/*" hidden aria-hidden="true" tabIndex={-1} onChange={(e) => void pick(e)} />
      <button class="btn secondary" onClick={() => file.current?.click()}>{t('analysis.photo')}</button>
      {photoId && <div class="photos"><MediaThumb id={photoId} /></div>}
      <button class="btn" data-testid="analysis-save" onClick={() => void save()}>{t('product.save')}</button>
      <button class="btn secondary" onClick={onDone}>{t('product.cancel')}</button>
    </section>
  );
}
