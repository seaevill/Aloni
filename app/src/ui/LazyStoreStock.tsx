import { useEffect, useState } from 'preact/hooks';

type StoreModule = typeof import('./StoreStock');

/** «Συγκομιδή στην αποθήκη» (orders, harvest records) is fetched when Αποθήκη opens, so it is not in the first load. */
export function LazyStoreStock() {
  const [mod, setMod] = useState<StoreModule | undefined>(undefined);
  useEffect(() => { void import('./StoreStock').then(setMod).catch(() => undefined); }, []);
  return mod ? <mod.StoreStock /> : null;
}
