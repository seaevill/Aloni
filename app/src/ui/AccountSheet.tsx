import { useEffect, useState } from 'preact/hooks';
import { activeFarm, db, lastBackupAt, realFarmId } from '../db';
import { exportBackupNow } from '../backup/export';
import { wipeAllowed } from '../account/wipe';
import { wipeThisPhone } from '../repo/wipe-local';
import { pendingOps } from '../repo';
import { syncEnabled } from '../sync/golive';
import { t } from '../i18n';
import { DetailSheet } from './ds/DetailSheet';
import { Icon } from './icons/Icon';
import { registerSheet, type SheetProps } from './sheets';

// «Διαγραφή λογαριασμού» (E7), in plain Greek: what happens when a worker leaves, what happens when the owner leaves, what is kept for 3 years and why, and the ONE thing that can be done today: deleting the data on THIS phone,
// only after a fresh backup, with the farm name typed, and with nothing unsent. The server account is not deletable from the app yet and the sheet says so; it never claims something was deleted that was not.
function AccountSheet({ close }: SheetProps) {
  const [phrase, setPhrase] = useState(t('farm.real')); const [typed, setTyped] = useState(''); const [saved, setSaved] = useState(false);
  const demo = activeFarm.value !== realFarmId.value;
  useEffect(() => { void db.settings.get('business').then((r) => { const n = (r?.value as { farm_name?: unknown } | undefined)?.farm_name; if (typeof n === 'string' && n.trim() !== '') setPhrase(n); }); }, []);   // the farm name the owner wrote in the go-live wizard, else the name the app shows
  const unsent = syncEnabled.value ? pendingOps.value : 0;
  const verdict = wipeAllowed({ typed, phrase, lastBackup: lastBackupAt.value, nowMs: Date.now(), unsent });
  const why = verdict.ok ? undefined : verdict.why;
  const backup = async () => { await exportBackupNow(); setSaved(true); };
  const wipe = async () => { await wipeThisPhone(db); try { localStorage.clear(); } catch { /* storage may be unavailable */ } location.assign('/'); };      // a new page load without the old fragment: the app starts on Σήμερα like a new phone
  return (
    <DetailSheet heading={t('ui.account.title')} icon={<Icon name="info" />} onClose={close} testid="sheet-account">
      <p class="ds-muted">{t('ui.account.intro')}</p>
      <h3>{t('ui.account.worker.title')}</h3><p data-testid="account-worker">{t('ui.account.worker.body')}</p>
      <h3>{t('ui.account.owner.title')}</h3><p data-testid="account-owner">{t('ui.account.owner.body')}</p>
      <h3>{t('ui.account.server.title')}</h3><p data-testid="account-server">{syncEnabled.value ? t('ui.account.server.on') : t('ui.account.server.off')}</p>
      <h3>{t('ui.account.phone.title')}</h3>
      {demo ? <p class="ds-muted" data-testid="account-demo">{t('ui.account.demo')}</p> : (
        <>
          <p>{t('ui.account.phone.body')}</p>
          <button type="button" class="btn secondary" data-testid="account-backup" onClick={() => void backup()}>{t('ui.account.backup')}</button>
          {saved && <p class="msg" role="status" data-testid="account-backup-done">{t('ui.account.backup.done')}</p>}
          <label class="field">{t('ui.account.type', { phrase })}<input class="input" autoComplete="off" value={typed} data-testid="account-typed" onInput={(e) => setTyped((e.target as HTMLInputElement).value)} /></label>
          {why === 'phrase' && <p class="ds-muted" data-testid="account-why">{t('ui.account.why.phrase')}</p>}
          {why === 'backup' && <p class="ds-muted" data-testid="account-why">{t('ui.account.why.backup')}</p>}
          {why === 'unsent' && <p class="ds-muted" data-testid="account-why">{t('ui.account.why.unsent', { n: unsent })}</p>}
          <button type="button" class="btn danger" data-testid="account-wipe" disabled={!verdict.ok} onClick={() => void wipe()}>{t('ui.account.wipe')}</button>
        </>
      )}
    </DetailSheet>
  );
}
registerSheet('account', AccountSheet);
