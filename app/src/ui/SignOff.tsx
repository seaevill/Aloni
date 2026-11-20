import { useRef, useState } from 'preact/hooks';
import { dataVersion, db, realFarmId } from '../db';
import { t } from '../i18n';
import { NOTE_MAX, withSignOff } from '../labels/label-use';
import { storePhoto } from '../media/photo';
import { MediaThumb } from './Photos';
import { athensToday } from '../plantings/planting';
import { put } from '../repo';
import type { Row } from '../db/schema';

/** Records that an agronomist approved EXACTLY these label values (name + real date), with a note and an optional photo of the label or the signature. The app does not check the claim; editing any value removes it. */
export function SignOff({ row, onDone }: { row: Row; onDone: () => void }) {
  const [by, setBy] = useState('');
  const [on, setOn] = useState(athensToday(new Date()) ?? '');
  const [note, setNote] = useState('');
  const [photoId, setPhotoId] = useState<string | undefined>(undefined);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [failed, setFailed] = useState<{ by: boolean; on: boolean; note: boolean } | undefined>(undefined);
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
    const tooLong = note.trim().length > NOTE_MAX;
    const signed = tooLong ? undefined : withSignOff(row, by, on, new Date().toISOString(), { note, ...(photoId ? { photoId } : {}) });
    if (!signed) { setFailed({ by: !tooLong && by.trim() === '', on: !tooLong && by.trim() !== '', note: tooLong }); return; }
    await put(db, 'label_uses', signed);
    dataVersion.value++;
    onDone();
  };
  return (
    <div class="card" data-testid="signoff-form">
      <p class="muted">{t('signoff.note')}</p>
      <label class="field">{t('signoff.by')}
        <input class="input" value={by} autoComplete="off" onInput={(e) => setBy((e.target as HTMLInputElement).value)} />
      </label>
      {failed?.by && <p class="msg error" role="alert">{t('signoff.error.by')}</p>}
      <label class="field">{t('signoff.on')}
        <input class="input" type="date" value={on} onInput={(e) => setOn((e.target as HTMLInputElement).value)} />
      </label>
      {failed?.on && <p class="msg error" role="alert">{t('signoff.error.date')}</p>}
      <label class="field">{t('signoff.noteField')}
        <input class="input" value={note} autoComplete="off" data-testid="signoff-note" onInput={(e) => setNote((e.target as HTMLInputElement).value)} />
      </label>
      {failed?.note && <p class="msg error" role="alert">{t('signoff.error.long')}</p>}
      <input ref={file} type="file" accept="image/*" hidden aria-hidden="true" tabIndex={-1} onChange={(e) => void pick(e)} />
      <button class="btn secondary" data-testid="signoff-photo" onClick={() => file.current?.click()}>{t('signoff.photo')}</button>
      {photoId && <div class="photos"><MediaThumb id={photoId} /></div>}
      {photoFailed && <p class="msg error" role="alert">{t('photos.error')}</p>}
      <button class="btn" data-testid="signoff-save" onClick={() => void save()}>{t('product.save')}</button>
      <button class="btn secondary" onClick={onDone}>{t('product.cancel')}</button>
    </div>
  );
}
