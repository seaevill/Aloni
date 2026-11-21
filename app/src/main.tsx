import { installErrorLog } from './diag/errorlog';
import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import './ui/fonts.css';
import './ui/tokens.css';
import './ui/styles.css';
import './ui/ds/ds.css';
import './ui/ds/motion.css';
import { App } from './ui/App';
import { db, initDb } from './db';
import { ensureAllLangs, ensureLang, lang } from './i18n';
import { bootSync } from './sync/boot';
import { onNeedRefresh, onOfflineReady, setApply, watchDirty, watchForUpdates } from './pwa/update';

document.documentElement.lang = lang.value;
setApply(registerSW({ immediate: true, onNeedRefresh, onOfflineReady, onRegisteredSW: (_url, reg) => watchForUpdates(reg) }).bind(null, true) as () => void);
watchDirty();
installErrorLog(db);      // the app's own errors are kept on this phone only (Info → «Αναφορά σφάλματος»); nothing is sent
void initDb().finally(async () => {
  await ensureLang(lang.value).catch(() => undefined);      // the phone's language (not Greek) is loaded before the first screen

  if (import.meta.env.VITE_DS_GALLERY === 'true' && location.search.includes('ds-gallery')) { const { Gallery } = await import('./ui/ds/Gallery'); render(<Gallery />, document.getElementById('app')!); return; }   // never in production
  render(<App />, document.getElementById('app')!); void bootSync();
  void ensureAllLangs().catch(() => undefined);      // warm the other languages right after the first screen (they are then in the cache before the phone goes offline)
});

// Load all three font files at start (Greek, Latin, Latin Extended for Turkish) while the phone is online, so no language ever has to fetch a font later, offline.
for (const sample of ['α', 'a', 'ğ']) void document.fonts?.load('16px Commissioner', sample).catch(() => undefined);
