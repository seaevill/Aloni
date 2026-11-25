import type { ComponentType } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { t } from '../i18n';

// A screen that is not part of the first-load JavaScript. Offline rule (DECISIONS 2026-11-22/23): on a phone's FIRST
// session the service worker does not control the page yet, so a chunk fetched later could fail offline. Therefore
// every lazy screen is registered here and `warmLazyScreens()` imports them all right after the first screen (main.tsx),
// while the phone is still online, exactly like the other languages (`ensureAllLangs`). Once imported, a module is in
// the page's module map: opening the screen later needs no network, in the first session or after.
type Loader = () => Promise<ComponentType<never>>;
const loaders: Loader[] = [];

export function lazyScreen<P>(load: () => Promise<ComponentType<P>>): ComponentType<P> {
  let loaded: ComponentType<P> | undefined;
  let pending: Promise<ComponentType<P>> | undefined;
  const get = () => (pending ??= load().then((component) => (loaded = component), (error: unknown) => { pending = undefined; throw error; }));
  loaders.push(get as unknown as Loader);
  return function LazyScreen(props: P) {
    const [component, setComponent] = useState<ComponentType<P> | undefined>(() => loaded);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
      if (component || failed) return;
      let live = true;
      get().then((c) => { if (live) setComponent(() => c); }, () => { if (live) setFailed(true); });
      return () => { live = false; };
    }, [component, failed]);
    const Screen = component ?? loaded;
    if (Screen) return <Screen {...(props as P & object)} />;
    if (failed) return <section class="lazy-screen" data-testid="lazy-screen-failed"><button type="button" class="btn" onClick={() => setFailed(false)}>{t('state.retry')}</button></section>;
    return <section class="lazy-screen" aria-busy="true" data-testid="lazy-screen-loading" />;
  };
}

/** Import every lazy screen now (call once after the first screen, while online). Failures are retried on open. */
export function warmLazyScreens(): Promise<unknown> {
  return Promise.allSettled(loaders.map((load) => load()));
}
