import { useEffect } from 'preact/hooks';
import { t } from '../i18n';
import { applyNow, dbBlocked, needRefresh, offlineReady } from '../pwa/update';

/** One line at the top: a new version waits (apply by tapping), the app is ready offline (once), or another tab blocks the database. */
const OFFLINE_NOTE_MS = 4000;      // «ready offline» is a state change, not a permanent banner: it goes away by itself

export function UpdateBar() {
  useEffect(() => {
    if (!offlineReady.value) return undefined;
    const id = setTimeout(() => { offlineReady.value = false; }, OFFLINE_NOTE_MS);
    return () => clearTimeout(id);
  }, [offlineReady.value]);
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
