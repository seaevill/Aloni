import { useState } from 'preact/hooks';
import { useBack } from './backstack';
import { activeFarm, dataVersion, deleteDemo, farmLabel, hasDemo, legacyKept, loadDemo, realFarmId } from '../db';
import { APP_NAME_EL, DEMO_FARM_ID } from '../config';
import { APP_VERSION } from '../version';
import { LANGS, LANG_META, lang, setLang, t } from '../i18n';

import { Info } from './Info';
import { Photos } from './Photos';
import { SettingsBox } from './SettingsBox';
import { Orders } from './Orders';
import { Register } from './Register';
import { Workers } from './Workers';
import { workerView } from './nav';
import { Backup } from './Backup';
import { GoLive } from './GoLive';
import { Notifications } from './Notifications';
import { Readiness } from './Readiness';
import { SignIn } from './SignIn';
import { showUndo } from './Toast';
import { weeklyCopy } from '../content/weekly-report';
import { WeeklyReport } from './cx/WeeklyReport';
import './more-v2.css';

const MENU_ICONS = {
  register: 'M6 3h12v18H6zM9 8h6M9 12h6M9 16h4',
  orders: 'M3 9h18v11H3zM3 9l3-5h12l3 5M8 13v3m4-3v3m4-3v3',
  worker: 'M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M13 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM17 10l2 2 3-4',
  workers: 'M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M13 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM18 4a3 3 0 0 1 0 6m1 4a4 4 0 0 1 2 4v2',
  photos: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 5M15 9h1',
  info: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zM12 11v6m0-10h.01',
};

function MenuIcon({ name }: { name: keyof typeof MENU_ICONS }) {
  return <span class="more-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d={MENU_ICONS[name]} /></svg></span>;
}

export function More() {
  const [msg, setMsg] = useState('');
  const [view, setView] = useState<'main' | 'info' | 'photos' | 'workers' | 'register' | 'orders' | 'weekly'>('main');
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  const openedFrom = [t(standalone ? 'more.openedFrom.home' : 'more.openedFrom.safari'), t('more.openedFrom.note')].join(' ');
  const demoLabel = t(hasDemo.value ? 'more.resetDemo' : 'more.loadDemo');
  useBack(view !== 'main', () => setView('main'));
  const pick = (id: string) => { activeFarm.value = id; dataVersion.value++; };
  if (view === 'info') return <Info onBack={() => setView('main')} />;
  if (view === 'weekly') return <WeeklyReport onBack={() => setView('main')} />;
  if (view === 'orders') return <Orders onBack={() => setView('main')} />;
  if (view === 'register') return <Register onBack={() => setView('main')} />;
  if (view === 'workers') return <Workers onBack={() => setView('main')} />;
  if (view === 'photos') return <Photos onBack={() => setView('main')} />;
  return (
    <section class="more-v2">
      <header class="today-head band"><h1>{t('more.title')}</h1></header>
      <nav class="menu" data-testid="more-menu" aria-label={t('more.menu')}>
        <button class="row" data-testid="open-register" onClick={() => setView('register')}><MenuIcon name="register" /><span>{t('register.open')}</span><span aria-hidden="true" class="chev" /></button>
        <button class="row" data-testid="open-orders" onClick={() => setView('orders')}><MenuIcon name="orders" /><span>{t('orders.open')}</span><span aria-hidden="true" class="chev" /></button>
        <button class="row" data-testid="open-weekly-report" onClick={() => setView('weekly')}><MenuIcon name="register" /><span>{weeklyCopy[lang.value].title}</span><span aria-hidden="true" class="chev" /></button>
        {activeFarm.value === DEMO_FARM_ID && <button class="row" data-testid="open-worker-view" onClick={() => { workerView.value = ''; }}><MenuIcon name="worker" /><span>{t('more.workerView')}</span><span aria-hidden="true" class="chev" /></button>}
        <button class="row" data-testid="open-workers" onClick={() => setView('workers')}><MenuIcon name="workers" /><span>{t('workers.open')}</span><span aria-hidden="true" class="chev" /></button>
        <button class="row" data-testid="open-photos" onClick={() => setView('photos')}><MenuIcon name="photos" /><span>{t('photos.title')}</span><span aria-hidden="true" class="chev" /></button>
        <button class="row" data-testid="open-info" onClick={() => setView('info')}><MenuIcon name="info" /><span>{t('more.info')}</span><span aria-hidden="true" class="chev" /></button>
      </nav>

      <h2>{t('more.settings')}</h2>

      <h2>{t('more.language')}</h2>
      <div class="seg">
        {LANGS.map((l) => (
          <button key={l} aria-pressed={lang.value === l} onClick={() => setLang(l)}>{LANG_META[l].label}</button>
        ))}
      </div>

      <h2>{t('more.activeFarm')}</h2>
      <div class="seg two">
        {[realFarmId.value, ...(hasDemo.value ? [DEMO_FARM_ID] : [])].map((id) => (
          <button key={id} aria-pressed={activeFarm.value === id} onClick={() => pick(id)}>{farmLabel(id)}</button>
        ))}
      </div>

      <button class="btn" data-testid="demo-load" onClick={async () => { await loadDemo(); setMsg(t('more.demoLoaded')); }}>{demoLabel}</button>
      {hasDemo.value && (
        <button class="btn danger" onClick={async () => { await deleteDemo(); showUndo(t('more.demoRemoved'), loadDemo); }}>{t('more.removeDemo')}</button>
      )}
      <p class="muted">{t('more.demoNote')}</p>
      {msg && <p class="msg" role="status">{msg}</p>}
      <Readiness part="owner" />
      <GoLive />
      <p class="muted" data-testid="this-phone">{t('more.thisPhone')}</p>
      <p class="muted" data-testid="opened-from">{openedFrom}</p>
      <SignIn />
      <Backup />
      <SettingsBox />
      <Notifications />
      {legacyKept.value && <p class="draft" role="note">{t('more.legacyKept')}</p>}
      <details class="card" data-testid="dev-section">
        <summary>{t('dev.title')}</summary>
        <Readiness part="dev" />
      </details>
      <p class="muted">{t('more.version', { v: APP_VERSION, name: APP_NAME_EL })}</p>
    </section>
  );
}
