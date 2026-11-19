import { useEffect, useState } from 'preact/hooks';
import { db, realFarmId } from '../db';
import { t } from '../i18n';
import { EMPTY_CONTROLLER, canInviteWorkers, loadController, saveController, type Controller } from '../legal/controller';
import { BackBar } from './BackBar';

/** Settings → Information: draft legal texts. The owner enters the data controller details once; they live in the database, never in the repo. */
export function Info({ onBack }: { onBack: () => void }) {
  const [c, setC] = useState<Controller>(EMPTY_CONTROLLER);
  const [saved, setSaved] = useState<Controller | undefined>(undefined);
  const [msg, setMsg] = useState('');
  useEffect(() => { void loadController(db).then((x) => { if (x) { setC(x); setSaved(x); } }); }, []);

  const unset = t('info.controller.unset');
  const shown = (v: string | undefined) => (v && v.trim() ? v : unset);
  const set = (k: keyof Controller) => (e: Event) => setC({ ...c, [k]: (e.target as HTMLInputElement).value });
  const save = async () => { await saveController(db, realFarmId.value, c); setSaved(c); setMsg(t('info.controller.saved')); };
  const invite = canInviteWorkers(saved);
  const field = (k: keyof Controller, label: 'info.controller.name' | 'info.controller.address' | 'info.controller.phone', mode: 'text' | 'tel') => (
    <label class="field">{t(label)}<input class="input" value={c[k]} inputMode={mode} autoComplete="off" onInput={set(k)} /></label>
  );

  return (
    <section>
      <BackBar onBack={onBack} />
      <h1 tabIndex={-1}>{t('info.title')}</h1>
      <p class="draft" role="note">{t('info.draft')}</p>

      <h2>{t('info.controller.title')}</h2>
      <p class="muted">{t('info.controller.note')}</p>
      {field('name', 'info.controller.name', 'text')}
      {field('address', 'info.controller.address', 'text')}
      {field('phone', 'info.controller.phone', 'tel')}
      <button class="btn" onClick={() => void save()}>{t('info.controller.save')}</button>
      {msg && <p class="msg" role="status">{msg}</p>}
      <p class="card" data-testid="invite-status">{invite.allowed ? t('info.invite.open') : t('info.invite.closed')}</p>

      <h2>{t('info.privacy.title')}</h2>
      <p class="card" data-testid="info-privacy">{t('info.privacy.body', { controller_name: shown(saved?.name), controller_address: shown(saved?.address), controller_phone: shown(saved?.phone) })}</p>

      <h2>{t('info.disclaimer.title')}</h2>
      <p class="card" data-testid="info-disclaimer">{t('info.disclaimer.body')}</p>

    </section>
  );
}
