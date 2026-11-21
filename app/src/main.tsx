import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import './ui/fonts.css';
import './ui/tokens.css';
import './ui/styles.css';
import './ui/ds/ds.css';
import './ui/ds/motion.css';
import { App } from './ui/App';
import { initDb } from './db';
import { ensureLang, lang } from './i18n';
import { bootSync } from './sync/boot';
import { onNeedRefresh, onOfflineReady, setApply, watchDirty, watchForUpdates } from './pwa/update';

document.documentElement.lang = lang.value;
setApply(registerSW({ immediate: true, onNeedRefresh, onOfflineReady, onRegisteredSW: (_url, reg) => watchForUpdates(reg) }).bind(null, true) as () => void);
watchDirty();
void initDb().finally(async () => {
  await ensureLang(lang.value).catch(() => undefined);      // the phone's language (not Greek) is loaded before the first screen

  if (import.meta.env.VITE_DS_GALLERY === 'true' && location.search.includes('ds-gallery')) { const { Gallery } = await import('./ui/ds/Gallery'); render(<Gallery />, document.getElementById('app')!); return; }   // never in production
  render(<App />, document.getElementById('app')!); void bootSync();
});

// Load all three font files at start (Greek, Latin, Latin Extended for Turkish) while the phone is online, so no language ever has to fetch a font later, offline.
for (const sample of ['α', 'a', 'ğ']) void document.fonts?.load('16px Commissioner', sample).catch(() => undefined);
