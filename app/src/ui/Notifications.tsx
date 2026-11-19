import { useEffect, useState } from 'preact/hooks';
import { dataVersion, db, realFarmId } from '../db';
import { t } from '../i18n';
import { DEFAULT_NOTIFY, validTime, type NotifySettings } from '../notify/policy';
import { PUSH, pushSupport, subscribe, unsubscribe, type PushSupport } from '../notify/push';
import { putSetting } from '../repo';

const KEY = 'notifications';

/** More → «Ειδοποιήσεις»: the on/off switch and the quiet hours. Nothing is SENT by the app yet (M4); signed rules only, outside the quiet hours, when it does. */
export function Notifications() {
  const [s, setS] = useState<NotifySettings>(DEFAULT_NOTIFY);
  const [bad, setBad] = useState(false); const [msg, setMsg] = useState<PushSupport | 'saved' | undefined>(undefined);
  useEffect(() => { void db.settings.get(KEY).then((r) => { if (r?.value) setS({ ...DEFAULT_NOTIFY, ...(r.value as Partial<NotifySettings>) }); }); }, []);
  const support = pushSupport({ hasServiceWorker: 'serviceWorker' in navigator, hasPush: 'PushManager' in window, permission: typeof Notification === 'undefined' ? undefined : Notification.permission }, PUSH.vapidPublicKey);
  const save = async (next: NotifySettings) => {
    if (!validTime(next.quietFrom) || !validTime(next.quietTo)) { setBad(true); return; }
    setBad(false); setS(next);
    await putSetting(db, realFarmId.value, KEY, next); dataVersion.value++; setMsg('saved');
  };
  const toggle = async () => {
    if (s.enabled) { await unsubscribe(db); await save({ ...s, enabled: false }); return; }
    if (support !== 'ready') { setMsg(support); return; }
    if (await subscribe(db, PUSH.vapidPublicKey)) await save({ ...s, enabled: true }); else setMsg('denied');
  };
  return (
    <section class="card" data-testid="notifications">
      <strong>{t('notify.title')}</strong>
      <p class="muted">{t('notify.note')}</p>
      <button class="btn secondary" data-testid="notify-toggle" aria-pressed={s.enabled} onClick={() => void toggle()}>{s.enabled ? t('notify.off') : t('notify.on')}</button>
      <label class="field">{t('notify.quiet.from')}<input class="input" type="time" value={s.quietFrom} data-testid="quiet-from" onInput={(e) => void save({ ...s, quietFrom: (e.target as HTMLInputElement).value })} /></label>
      <label class="field">{t('notify.quiet.to')}<input class="input" type="time" value={s.quietTo} data-testid="quiet-to" onInput={(e) => void save({ ...s, quietTo: (e.target as HTMLInputElement).value })} /></label>
      {bad && <p class="msg error" role="alert">{t('notify.error.time')}</p>}
      {msg === 'saved' && <p class="muted" role="status" data-testid="notify-saved">{t('notify.saved')}</p>}
      {msg === 'no_key' && <p class="muted" role="status" data-testid="notify-nokey">{t('notify.nokey')}</p>}
      {msg === 'unsupported' && <p class="muted" role="status">{t('notify.unsupported')}</p>}
      {msg === 'denied' && <p class="muted" role="status">{t('notify.denied')}</p>}
    </section>
  );
}
