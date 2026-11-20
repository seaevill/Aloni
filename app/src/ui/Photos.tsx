import { useEffect, useRef, useState } from 'preact/hooks';
import { activeFarm, dataVersion, db, realFarmId } from '../db';
import type { MediaRow } from '../db/schema';
import { formatDateTime, t, tn, type I18nKey } from '../i18n';
import { storePhoto } from '../media/photo';
import { EmptyState } from './states';
import { BackBar } from './BackBar';

const MSG_KEYS: Record<'saved' | 'duplicate' | 'error', I18nKey> = { saved: 'photos.saved', duplicate: 'photos.duplicate', error: 'photos.error' };

/** An object URL for a stored photo; released when the picture leaves the screen. */
function useBlobUrl(data: ArrayBuffer, mime: string): string {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const u = URL.createObjectURL(new Blob([data], { type: mime }));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [data, mime]);
  return url;
}

export function Picture({ m, big }: { m: MediaRow; big?: boolean }) {
  const url = useBlobUrl(m.data, m.mime);
  return url ? <img class={big ? 'photo big' : 'photo'} src={url} alt={t('photos.alt')} width={m.width} height={m.height} /> : null;
}

/** A stored photo by id (e.g. a product's label photo), small. Nothing is drawn while it loads or if it is missing. */
export function MediaThumb({ id }: { id: string }) {
  const [m, setM] = useState<MediaRow | undefined>(undefined);
  useEffect(() => { void db.media.get(id).then(setM); }, [id]);
  return m ? <Picture m={m} /> : null;
}

/** More → Photos: what is stored on this phone. Add (camera or library), see, open full size. Photos are never deleted or edited. */
export function Photos({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = useState<MediaRow[] | null>(null);
  const [open, setOpen] = useState<MediaRow | undefined>(undefined);
  const [msg, setMsg] = useState<'saved' | 'duplicate' | 'error' | undefined>(undefined);
  const input = useRef<HTMLInputElement>(null);
  const demo = activeFarm.value !== realFarmId.value;
  const ver = dataVersion.value;
  useEffect(() => { void db.media.where('farm_id').equals(activeFarm.value).toArray().then(setRows); }, [ver, activeFarm.value]);

  const pick = async (e: Event) => {
    const el = e.target as HTMLInputElement;
    const file = el.files?.[0];
    el.value = ''; // the same file can be picked again (it is then recognised as a duplicate)
    if (!file) return;
    setMsg((await storePhoto(db, realFarmId.value, file, new Date().toISOString())).result);
    dataVersion.value++;
  };

  if (open) {
    const nth = (rows ?? []).findIndex((m) => m.id === open.id) + 1;
    return (
      <section role="dialog" aria-modal="true" onKeyDown={(e) => { if (e.key === 'Escape') setOpen(undefined); }} aria-label={t('photos.viewer', { n: nth, total: rows ? String(rows.length) : '', when: formatDateTime(open.created_at) })} data-testid="photo-viewer">
        <button class="btn secondary" ref={(el) => el?.focus()} onClick={() => setOpen(undefined)}>{t('photos.close')}</button>
        <Picture m={open} big />
      </section>
    );
  }
  const add = () => input.current?.click();
  return (
    <section>
      <BackBar onBack={onBack} />
      <h1 tabIndex={-1}>{t('photos.title')}</h1>
      <input ref={input} type="file" accept="image/*" hidden aria-hidden="true" tabIndex={-1} onChange={(e) => void pick(e)} />
      {demo ? <p class="muted" data-testid="photos-demo-note">{t('photos.demoActive')}</p>
        : rows && rows.length > 0 && <button class="btn" data-testid="photo-add" onClick={add}>{t('photos.add')}</button>}
      {msg && <p class="msg" role="status" data-testid="photo-msg">{t(MSG_KEYS[msg])}</p>}
      {rows && rows.length === 0 && !demo && <EmptyState message={t('photos.empty')} actionLabel={t('photos.add')} onAction={add} />}
      {rows && rows.length > 0 && <p class="muted" data-testid="photo-count">{tn('photos.count', rows.length)}</p>}
      <div class="photos">
        {rows?.map((m) => <button key={m.id} class="thumb" data-testid="photo" onClick={() => setOpen(m)}><Picture m={m} /></button>)}
      </div>
    </section>
  );
}
