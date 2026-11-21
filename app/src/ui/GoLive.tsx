import { useEffect, useState } from 'preact/hooks';
import { AUTH_ENABLED, SYNC_CONNECTED } from '../config';
import { session } from '../auth/gotrue';
import { backupStale } from '../backup/warnings';
import { exportBackupNow } from '../backup/export';
import { dataVersion, db, lastBackupAt, realFarmId } from '../db';
import { t, type I18nKey } from '../i18n';
import { loadController } from '../legal/controller';
import { BUSINESS_KEY, READINESS_KEY, readinessOf, type Business, type Confirmed } from '../settings/readiness';
import { liveEndpoint } from '../sync/boot';
import { canGoLive, goLive, goLiveItems, setSyncFlag, syncEnabled, type GoLiveKey, type GoLiveResult } from '../sync/golive';

const LABELS: Record<GoLiveKey, I18nKey> = {
  controller: 'ready.controller', farm_name: 'ready.farm_name', vat: 'ready.vat', migration: 'ready.migration', advisor: 'ready.advisor', signed_in: 'golive.signed_in', backup: 'golive.backup',
};
const GAP = ' ';

/** «Go live» wizard: only when the live features exist (config.LIVE). The button is active only when every item is ok; it uploads everything once, then the rounds take over. A failure switches nothing on. */
export function GoLive() {
  const [items, setItems] = useState<Array<{ key: GoLiveKey; ok: boolean }>>([]);
  const [busy, setBusy] = useState(false); const [result, setResult] = useState<GoLiveResult | undefined>(undefined);
  const ver = dataVersion.value; const signedIn = session.value !== undefined; const last = lastBackupAt.value;
  useEffect(() => {
    void (async () => {
      const controller = await loadController(db);
      const business = (await db.settings.get(BUSINESS_KEY))?.value as Business | undefined;
      const confirmed = (await db.settings.get(READINESS_KEY))?.value as Confirmed | undefined;
      setItems(goLiveItems(readinessOf({ controller, business, confirmed }).items, { signedIn, backupFresh: !backupStale(last, Date.now(), true) }));
    })();
  }, [ver, signedIn, last]);
  if (!AUTH_ENABLED || !SYNC_CONNECTED) return null;
  if (syncEnabled.value) return <section class="card" data-testid="golive-on"><strong>{t('golive.title')}</strong><p class="msg" role="status">{t('golive.on')}</p></section>;
  const run = async () => {
    const ep = liveEndpoint();
    if (!ep) return;
    setBusy(true); setResult(undefined);
    const r = await goLive(db, ep.transport, realFarmId.value, ep.media);
    await setSyncFlag(db, r.ok);   // on only when everything worked; otherwise it stays OFF (nothing local was changed)
    dataVersion.value += 1;
    setResult(r); setBusy(false);
  };
  const ready = canGoLive(items);
  return (
    <section class="card" data-testid="golive">
      <strong>{t('golive.title')}</strong>
      <p class="muted">{t('golive.note')}</p>
      <ul class="checklist">
        {items.map((i) => { const look = i.ok ? { cls: 'badge signed', word: t('ready.ok') } : { cls: 'badge blocked', word: t('ready.missing') }; return <li key={i.key} data-testid={`golive-${i.key}`} data-ok={i.ok ? 'yes' : 'no'}><span class={look.cls}>{look.word}</span>{GAP}{t(LABELS[i.key])}</li>; })}
      </ul>
      {items.some((i) => i.key === 'backup' && !i.ok) && <button class="btn secondary" data-testid="golive-backup-now" onClick={() => void exportBackupNow()}>{t('golive.backup.now')}</button>}
      <button class="btn" data-testid="golive-start" disabled={!ready || busy} onClick={() => void run()}>{t('golive.start')}</button>
      {busy && <p class="muted" role="status" data-testid="golive-busy">{t('golive.busy')}</p>}
      {result?.ok === false && <p class="msg error" role="alert" data-testid="golive-failed">{t('golive.failed')}<small>{result.message}</small></p>}
    </section>
  );
}
