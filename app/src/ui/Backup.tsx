import { useEffect, useRef, useState } from 'preact/hooks';
import { dataVersion, db, activeFarm, lastBackupAt, realFarmId } from '../db';
import { formatDate, t, type I18nKey } from '../i18n';
import { backupStale, isIos, storageWarnings } from '../backup/warnings';
import { downloadText } from '../backup/download';
import { pendingOps } from '../repo';
import { BackupError, makeBackup, markBackupDone, parseBackup, restoreBackup, type BackupErrorCode } from '../repo/backup';
import { APP_VERSION } from '../version';

const ERROR_KEYS: Record<BackupErrorCode, I18nKey> = {
  format: 'backup.error.format', version: 'backup.error.version', sha256: 'backup.error.sha256', demo: 'backup.error.demo', conflict: 'backup.error.conflict',
};

/** Global strong warning: there is data on the phone and no backup newer than 7 days. */
export function BackupBanner() {
  return backupStale(lastBackupAt.value, Date.now(), pendingOps.value > 0) ? <p class="chip" role="alert" data-testid="backup-stale">{t('backup.stale')}</p> : null;
}

/** More → backup: «Μόνο σε αυτό το τηλέφωνο · τελευταίο αντίγραφο: …», export, restore, and the Home-Screen / storage warnings. */
export function Backup() {
  const [msg, setMsg] = useState('');
  const [persisted, setPersisted] = useState<boolean | undefined>(undefined);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => { void navigator.storage?.persisted?.().then(setPersisted); }, []);
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  const warnings = storageWarnings({ standalone, ios: isIos(navigator.userAgent, navigator.maxTouchPoints), persisted });
  const last = lastBackupAt.value;

  const exportBackup = async () => {
    const farm = await db.farms.get(realFarmId.value);
    const b = await makeBackup(db, { id: realFarmId.value, name: farm?.name ?? '' }, APP_VERSION);
    const now = new Date().toISOString();
    downloadText(`aloni-backup-${now.slice(0, 10)}.json`, JSON.stringify(b));
    await markBackupDone(db, now);
    lastBackupAt.value = now;
    setMsg(t('backup.exported', { n: Object.values(b.tables).flat().length + b.settings.length }));
  };
  const restore = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    try {
      const r = await restoreBackup(db, parseBackup(await f.text()), realFarmId.value);
      realFarmId.value = r.farmId;
      activeFarm.value = r.farmId;
      dataVersion.value++;
      const list = r.skipped.slice(0, 8).map((x) => x.label).join(', ');
      setMsg(r.skipped.length ? `${t('backup.restored', { added: r.added, updated: r.updated, same: r.same })} ${t('backup.skipped', { n: r.skipped.length, list })}` : t('backup.restored', { added: r.added, updated: r.updated, same: r.same }));
    } catch (err) {
      setMsg(err instanceof BackupError ? t(ERROR_KEYS[err.code]) : t('state.error'));
    }
    input.value = '';
  };

  return (
    <>
      <h2>{t('backup.title')}</h2>
      {warnings.map((w) => <p class="draft" role="note" key={w}>{t(w)}</p>)}
      <p class="muted" data-testid="backup-note">{t('backup.note', { when: last ? formatDate(last.slice(0, 10)) : t('backup.never') })}</p>
      <p class="muted" data-testid="backup-sensitive">{t('backup.sensitive')}</p>
      <button class="btn" onClick={() => void exportBackup()}>{t('backup.export')}</button>
      <button class="btn secondary" onClick={() => file.current?.click()}>{t('backup.restore')}</button>
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => void restore(e)} />
      {msg && <p class="msg" role="status" data-testid="backup-msg">{msg}</p>}
    </>
  );
}
