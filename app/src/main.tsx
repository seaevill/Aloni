import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import './ui/fonts.css';
import './ui/tokens.css';
import './ui/styles.css';
import { App } from './ui/App';
import { initDb } from './db';
import { lang } from './i18n';
import { bootSync } from './sync/boot';

document.documentElement.lang = lang.value;
registerSW({ immediate: true });
void initDb().finally(() => { render(<App />, document.getElementById('app')!); void bootSync(); });

// Load all three font files at start (Greek, Latin, Latin Extended for Turkish) while the phone is online, so no language ever has to fetch a font later, offline.
for (const sample of ['α', 'a', 'ğ']) void document.fonts?.load('16px Commissioner', sample).catch(() => undefined);
