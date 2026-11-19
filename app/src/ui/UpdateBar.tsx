import { t } from '../i18n';
import { applyNow, dbBlocked, needRefresh, offlineReady } from '../pwa/update';

/** One line at the top: a new version waits (apply by tapping), the app is ready offline (once), or another tab blocks the database. */
export function UpdateBar() {
  return (
    <>
      {needRefresh.value && (
        <p class="chip calm update-bar" role="status" data-testid="update-bar">
          <span>{t('pwa.update')}</span>
          <button class="btn secondary" data-testid="update-apply" onClick={applyNow}>{t('pwa.update.apply')}</button>
        </p>
      )}
      {offlineReady.value && !needRefresh.value && (
        <p class="chip calm" role="note" data-testid="offline-ready" onClick={() => { offlineReady.value = false; }}>{t('pwa.offline')}</p>
      )}
      {dbBlocked.value !== undefined && <p class="chip" role="alert" data-testid="db-blocked">{t('pwa.blocked')}</p>}
    </>
  );
}
