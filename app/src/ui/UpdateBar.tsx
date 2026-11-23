import { useEffect } from 'preact/hooks';
import { t } from '../i18n';
import { applyNow, dbBlocked, needRefresh, offlineReady } from '../pwa/update';

/** The «ready offline» note shows for this long, then goes by itself. */
const OFFLINE_NOTE_MS = 4000;

/** A new version waits (apply by tapping), the app is ready offline (a short note that floats over the screen and never moves the content: it appears at a moment the person did not choose), or another tab blocks the database. */
export function UpdateBar() {
  useEffect(() => {
    if (!offlineReady.value) return undefined;
    const timer = setTimeout(() => { offlineReady.value = false; }, OFFLINE_NOTE_MS);
    return () => clearTimeout(timer);
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
        <p class="chip calm offline-note" role="note" data-testid="offline-ready">{t('pwa.offline')}</p>
      )}
      {dbBlocked.value !== undefined && <p class="chip" role="alert" data-testid="db-blocked">{t('pwa.blocked')}</p>}
    </>
  );
}
