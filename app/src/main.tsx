import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import './ui/styles.css';
import { App } from './ui/App';
import { initDb } from './db';
import { lang } from './i18n';

document.documentElement.lang = lang.value;
registerSW({ immediate: true });
void initDb().finally(() => render(<App />, document.getElementById('app')!));
