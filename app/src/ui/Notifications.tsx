import { useEffect, useState } from 'preact/hooks';
import { dataVersion, db, realFarmId } from '../db';
import { t } from '../i18n';
import { DEFAULT_NOTIFY, validTime, type NotifySettings } from '../notify/policy';
import { PUSH, pushSupport, subscribe, unsubscribe, type PushSupport } from '../notify/push';
import { noticeOf, RULE_IDS, SIGNOFF_KEY, type RuleId, type RuleNotice } from '../notify/rules';
import { putSetting } from '../repo';

const KEY = 'notifications';
const RULE_NAME: Record<RuleId, () => string> = {
  spray_win: () => t('rule.spray_win'),
  phi: () => t('rule.phi'),
  phi_guard: () => t('rule.phi_guard'),
  rei: () => t('rule.rei'),
  rot: () => t('rule.rot'),
  reg: () => t('rule.reg'),
  stock: () => t('rule.stock'),
  frost: () => t('rule.frost'),
  dm_spin: () => t('rule.dm_spin'),
  lwd: () => t('rule.lwd'),
  n: () => t('rule.n'),
  irr: () => t('rule.irr'),
  salt: () => t('rule.salt'),
  sow: () => t('rule.sow'),
  harv_fc: () => t('rule.harv_fc'),
  gap: () => t('rule.gap'),
};
const NOTICE_TEXT: Record<RuleNotice, () => string> = {
  unsigned: () => t('notify.rules.unsigned'),
  allowed: () => t('notify.rules.allowed'),
  quiet: () => t('notify.rules.quiet'),
  off: () => t('notify.rules.off'),
};

/** More → «Ειδοποιήσεις»: the on/off switch and the quiet hours. Nothing is SENT by the app yet (M4); signed rules only, outside the quiet hours, when it does. */
export function Notifications() {
  const [s, setS] = useState<NotifySettings>(DEFAULT_NOTIFY);
  const [signoffs, setSignoffs] = useState<Record<string, unknown>>({});
  const [bad, setBad] = useState(false); const [msg, setMsg] = useState<PushSupport | 'saved' | undefined>(undefined);
  useEffect(() => { void db.settings.get(KEY).then((r) => { if (r?.value) setS({ ...DEFAULT_NOTIFY, ...(r.value as Partial<NotifySettings>) }); }); void db.settings.get(SIGNOFF_KEY).then((r) => { if (r?.value) setSignoffs(r.value as Record<string, unknown>); }); }, []);
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
      <strong>{t('notify.rules.title')}</strong>
      <ul class="list" data-testid="notify-rules">
        {RULE_IDS.map((id) => {
          const n = noticeOf(signoffs, id, new Date(), s);
          return <li key={id} data-testid={`rule-${id}`} data-notice={n}>{RULE_NAME[id]()}<span class="muted">{NOTICE_TEXT[n]()}</span></li>;
        })}
      </ul>
      {bad && <p class="msg error" role="alert">{t('notify.error.time')}</p>}
      {msg === 'saved' && <p class="muted" role="status" data-testid="notify-saved">{t('notify.saved')}</p>}
      {msg === 'no_key' && <p class="muted" role="status" data-testid="notify-nokey">{t('notify.nokey')}</p>}
      {msg === 'unsupported' && <p class="muted" role="status">{t('notify.unsupported')}</p>}
      {msg === 'denied' && <p class="muted" role="status">{t('notify.denied')}</p>}
    </section>
  );
}
