import { useEffect, useState } from 'preact/hooks';
import { activeFarm, db } from '../db';
import { t } from '../i18n';
import { isKaek, kaekOf, kaekOnRow, kaekServerOn, loadKaek, removeKaek, saveKaekOnRow, setKaek } from '../kaek/kaek';
import { dataVersion } from '../db';
import './kaek.css';

// Χωράφι › «ΚΑΕΚ»: the 12-digit cadastre number of the plot, typed by the owner. Kept on this phone; nothing is looked up and no request leaves the phone.
export function KaekCard({ parcelId, readOnly }: { parcelId: string; readOnly: boolean }) {
  const farm = activeFarm.value;
  const [value, setValue] = useState<string>(); const [edit, setEdit] = useState(false); const [draft, setDraft] = useState('');
  const [server, setServer] = useState(false); const [why, setWhy] = useState(''); const [whyMissing, setWhyMissing] = useState(false);
  const reload = async () => { const on = await kaekServerOn(db, farm); setServer(on); setValue((on ? await kaekOnRow(db, parcelId) : undefined) ?? kaekOf(await loadKaek(db, farm), parcelId)); };   // on the server the parcel row holds it; a number typed on the phone before is still shown and can be saved up with a reason
  useEffect(() => { void reload(); }, [farm, parcelId, dataVersion.value]);
  const bad = draft !== '' && !isKaek(draft);
  const finish = async (r: Awaited<ReturnType<typeof saveKaekOnRow>>) => { if (r === 'reason') { setWhyMissing(true); return; } setWhyMissing(false); setWhy(''); setEdit(false); if (r === 'ok') await removeKaek(db, farm, parcelId); dataVersion.value++; await reload(); };   // saved up: the phone copy goes
  const save = async () => { if (server) { await finish(await saveKaekOnRow(db, parcelId, draft, why)); return; } await setKaek(db, farm, parcelId, draft); setEdit(false); await reload(); };
  const remove = async () => { if (server) { await finish(await saveKaekOnRow(db, parcelId, undefined, why)); return; } await removeKaek(db, farm, parcelId); setEdit(false); await reload(); };
  return (
    <section class="card kaek" data-testid="kaek-card">
      <h3>{t('ui.kaek.title')}</h3>
      {value ? <p class="kaek-num" data-testid="kaek-value" lang="el">{value}</p> : <p class="muted" data-testid="kaek-none">{t('ui.kaek.none')}</p>}
      {!readOnly && !edit && <button type="button" class="btn secondary" data-testid="kaek-edit" onClick={() => { setDraft(value ?? ''); setEdit(true); }}>{t('ui.kaek.edit')}</button>}
      {edit && <div class="kaek-form" data-testid="kaek-form">
        <label class="field"><span class="ds-muted">{t('ui.kaek.label')}</span><input class="input" inputMode="numeric" maxLength={14} value={draft} autoComplete="off" data-testid="kaek-input" onInput={(e) => setDraft((e.target as HTMLInputElement).value)} /></label>
        {bad && <p class="msg error" role="alert" data-testid="kaek-error">{t('ui.kaek.err')}</p>}
        {server && <label class="field">{t('edit.reason')}<input class="input" value={why} autoComplete="off" data-testid="kaek-reason" onInput={(e) => setWhy((e.target as HTMLInputElement).value)} /></label>}
        {whyMissing && why.trim() === '' && <p class="msg error" role="alert" data-testid="kaek-reason-error">{t('edit.reason.error')}</p>}
        <button type="button" class="btn" data-testid="kaek-save" disabled={!isKaek(draft)} onClick={() => void save()}>{t('ui.kaek.save')}</button>
        {value && <button type="button" class="btn quiet" data-testid="kaek-remove" onClick={() => void remove()}>{t('ui.kaek.remove')}</button>}
      </div>}
      {!server && <small data-testid="kaek-local">{t('ui.kaek.local')}</small>}
    </section>
  );
}
