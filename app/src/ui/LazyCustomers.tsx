import { useEffect, useState } from 'preact/hooks';
import { t } from '../i18n';

type CustomersModule = typeof import('./Customers');

/** Άλλα → Πελάτες is opened rarely: its code is fetched when it opens, so it is not in the first load. */
export function LazyCustomers({ onBack }: { onBack: () => void }) {
  const [mod, setMod] = useState<CustomersModule | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  useEffect(() => { void import('./Customers').then(setMod).catch(() => setFailed(true)); }, []);
  if (mod) return <mod.Customers onBack={onBack} />;
  return failed ? <p role="alert">{t('state.error')}</p> : null;
}
