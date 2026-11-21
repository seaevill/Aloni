import { useRef, useState } from 'preact/hooks';
import { activeFarm, dataVersion, db } from '../db';
import type { Row } from '../db/schema';
import { t, type I18nKey } from '../i18n';
import { storePhoto } from '../media/photo';
import { put, actorId } from '../repo';
import { buildObservation, OBSERVATION_KINDS, type ObservationKind } from '../worker/jobs';
import { MediaThumb } from './Photos';
import { nameOf } from './screens';
import { useRows } from './useRows';

const KIND_KEYS: Record<ObservationKind, I18nKey> = { dew: 'worker.kind.dew', frost_damage: 'worker.kind.frost_damage', disease: 'worker.kind.disease', pest: 'worker.kind.pest', other: 'worker.kind.other' };

/** The owner writes down what he saw in a field (parcel, kind, a note, an optional photo). The same record a worker writes; the words are the owner's, nothing is diagnosed. */
export function ObservationForm({ onDone }: { onDone: (saved: boolean) => void }) {
  const parcels = useRows('parcels');
  const [parcel, setParcel] = useState(''); const [kind, setKind] = useState<ObservationKind | undefined>(undefined); const [note, setNote] = useState('');
  const [photoId, setPhotoId] = useState<string | undefined>(undefined); const [photoFailed, setPhotoFailed] = useState(false); const [failed, setFailed] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const pick = async (e: Event) => {
    const el = e.target as HTMLInputElement; const f = el.files?.[0]; el.value = '';
    if (!f) return;
    const r = await storePhoto(db, activeFarm.value, f, new Date().toISOString());
    setPhotoFailed(r.result === 'error'); if (r.id) setPhotoId(r.id);
  };
  const save = async () => {
    const me = { id: await actorId(db) } as unknown as Row;
    const row = buildObservation(parcel, kind, note, me, activeFarm.value, new Date().toISOString(), crypto.randomUUID(), photoId);
    if (!row) { setFailed(true); return; }
    await put(db, 'observations', row, 'insert');
    dataVersion.value++; onDone(true);
  };
  return (
    <section data-testid="observation-form">
      <h1>{t('ui.quick.observe')}</h1>
      <h2>{t('worker.observe.parcel')}</h2>
      <div class="seg two">{(parcels.rows ?? []).filter((p) => !p.deleted_at).map((p) => <button key={String(p.id)} aria-pressed={parcel === p.id} onClick={() => setParcel(String(p.id))}>{nameOf(p)}</button>)}</div>
      <h2>{t('worker.observe.kind')}</h2>
      <div class="seg two">{OBSERVATION_KINDS.map((k) => <button key={k} aria-pressed={kind === k} data-testid={`kind-${k}`} onClick={() => setKind(k)}>{t(KIND_KEYS[k])}</button>)}</div>
      <label class="field">{t('worker.observe.note')}<input class="input" value={note} autoComplete="off" onInput={(e) => setNote((e.target as HTMLInputElement).value)} /></label>
      <input ref={file} type="file" accept="image/*" capture="environment" hidden aria-hidden="true" tabIndex={-1} onChange={(e) => void pick(e)} />
      <button class="btn secondary" data-testid="observe-photo" onClick={() => file.current?.click()}>{t('worker.observe.photo')}</button>
      {photoId && <div class="photos"><MediaThumb id={photoId} /></div>}
      {photoFailed && <p class="msg error" role="alert">{t('photos.error')}</p>}
      {failed && <p class="msg error" role="alert" data-testid="observe-error">{t('ui.quick.observe.error')}</p>}
      <button class="btn" data-testid="observe-save" onClick={() => void save()}>{t('worker.observe.save')}</button>
      <button class="btn secondary" onClick={() => onDone(false)}>{t('worker.back')}</button>
    </section>
  );
}
