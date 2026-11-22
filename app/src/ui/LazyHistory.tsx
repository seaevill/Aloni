import { useEffect, useState } from 'preact/hooks';
import { t } from '../i18n';

type HistoryModule = typeof import('./History');

/** «Ιστορικό» is opened rarely: its code (spray and harvest records, edit trails) is fetched when it opens, so it is not in the first load. */
export function LazyHistory({ readOnly, onBack }: { readOnly: boolean; onBack: () => void }) {
  const [mod, setMod] = useState<HistoryModule | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  useEffect(() => { void import('./History').then(setMod).catch(() => setFailed(true)); }, []);
  if (mod) return <mod.History readOnly={readOnly} onBack={onBack} />;
  return failed ? <p role="alert">{t('state.error')}</p> : null;
}
