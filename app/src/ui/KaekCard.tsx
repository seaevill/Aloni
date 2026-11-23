import { useEffect, useState } from 'preact/hooks';
import { activeFarm, db } from '../db';
import { t } from '../i18n';
import { isKaek, kaekOf, loadKaek, removeKaek, setKaek } from '../kaek/kaek';
import './kaek.css';
import { NoteTip } from './NoteTip';

// Χωράφι › «ΚΑΕΚ»: the 12-digit cadastre number of the plot, typed by the owner. Kept on this phone; nothing is looked up and no request leaves the phone.
export function KaekCard({ parcelId, readOnly }: { parcelId: string; readOnly: boolean }) {
  const farm = activeFarm.value;
  const [value, setValue] = useState<string>(); const [edit, setEdit] = useState(false); const [draft, setDraft] = useState('');
  const reload = async () => setValue(kaekOf(await loadKaek(db, farm), parcelId));
  useEffect(() => { void reload(); }, [farm, parcelId]);
  if (readOnly && value === undefined) return null;          // nothing to show and nothing to edit (the Demo): no empty card
  const bad = draft !== '' && !isKaek(draft);
  const save = async () => { await setKaek(db, farm, parcelId, draft); setEdit(false); await reload(); };
  return (
    <section class="card kaek" data-testid="kaek-card">
      <h3>{t('ui.kaek.title')}</h3>
      {value ? <p class="kaek-num" data-testid="kaek-value" lang="el">{value}</p> : <p class="muted" data-testid="kaek-none">{t('ui.kaek.none')}</p>}
      {!readOnly && !edit && <button type="button" class="btn secondary" data-testid="kaek-edit" onClick={() => { setDraft(value ?? ''); setEdit(true); }}>{t('ui.kaek.edit')}</button>}
      {edit && <div class="kaek-form" data-testid="kaek-form">
        <label class="field"><span class="ds-muted">{t('ui.kaek.label')}</span><input class="input" inputMode="numeric" maxLength={14} value={draft} autoComplete="off" data-testid="kaek-input" onInput={(e) => setDraft((e.target as HTMLInputElement).value)} /></label>
        {bad && <p class="msg error" role="alert" data-testid="kaek-error">{t('ui.kaek.err')}</p>}
        <button type="button" class="btn" data-testid="kaek-save" disabled={!isKaek(draft)} onClick={() => void save()}>{t('ui.kaek.save')}</button>
        {value && <button type="button" class="btn quiet" data-testid="kaek-remove" onClick={() => void removeKaek(db, farm, parcelId).then(() => { setEdit(false); return reload(); })}>{t('ui.kaek.remove')}</button>}
      </div>}
      <NoteTip testid="kaek-local" text={t('ui.kaek.local')} />
    </section>
  );
}
