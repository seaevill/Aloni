import { useState } from 'preact/hooks';
import { useBack } from './backstack';
import { activeFarm } from '../db';
import { APP_NAME_EL, DEMO_FARM_ID } from '../config';
import { APP_VERSION } from '../version';
import { LANGS, LANG_META, lang, setLang, t } from '../i18n';

import { Photos } from './Photos';
import { MoreSettings } from './MoreSettings';
import { lazyScreen } from './lazyScreen';
import { tab, workerView } from './nav';
import { weeklyCopy } from '../content/weekly-report';
import './more-v2.css';

// Opened from Άλλα only, never in a first visit's first seconds: kept out of the first-load JavaScript (warmed after the first screen, see lazyScreen.tsx).
const Orders = lazyScreen(() => import('./Orders').then((m) => m.Orders));
const Customers = lazyScreen(() => import('./Customers').then((m) => m.Customers));
const Register = lazyScreen(() => import('./Register').then((m) => m.Register));
const Info = lazyScreen(() => import('./Info').then((m) => m.Info));
const Workers = lazyScreen(() => import('./Workers').then((m) => m.Workers));
const Money = lazyScreen(() => import('./Money').then((m) => m.Money));
const WeeklyReport = lazyScreen(() => import('./cx/WeeklyReport').then((m) => m.WeeklyReport));

const MENU_ICONS = {
  register: 'M6 3h12v18H6zM9 8h6M9 12h6M9 16h4',
  orders: 'M3 9h18v11H3zM3 9l3-5h12l3 5M8 13v3m4-3v3m4-3v3',
  worker: 'M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M13 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM17 10l2 2 3-4',
  workers: 'M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M13 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM18 4a3 3 0 0 1 0 6m1 4a4 4 0 0 1 2 4v2',
  photos: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 5M15 9h1',
  money: 'M3 6h18v12H3zM3 10h18M7 15h3',
  stock: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
  settings: 'M4 7h10M18 7h2M4 17h2M10 17h10M16 5v4M8 15v4',
  info: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zM12 11v6m0-10h.01',
};

function MenuIcon({ name }: { name: keyof typeof MENU_ICONS }) {
  return <span class="more-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d={MENU_ICONS[name]} /></svg></span>;
}

export function More() {
  const [view, setView] = useState<'main' | 'info' | 'photos' | 'workers' | 'register' | 'orders' | 'weekly' | 'customers' | 'money' | 'settings'>('main');
  useBack(view !== 'main', () => setView('main'));
  if (view === 'settings') return <MoreSettings onBack={() => setView('main')} />;
  if (view === 'info') return <Info onBack={() => setView('main')} />;
  if (view === 'weekly') return <WeeklyReport onBack={() => setView('main')} />;
  if (view === 'orders') return <Orders onBack={() => setView('main')} />;
  if (view === 'customers') return <Customers onBack={() => setView('main')} />;
  if (view === 'money') return <Money onBack={() => setView('main')} />;
  if (view === 'register') return <Register onBack={() => setView('main')} />;
  if (view === 'workers') return <Workers onBack={() => setView('main')} />;
  if (view === 'photos') return <Photos onBack={() => setView('main')} />;
  return (
    <section class="more-v2">
      <header class="today-head band"><h1>{t('more.title')}</h1></header>
      <nav class="menu" data-testid="more-menu" aria-label={t('more.menu')}>
        <h2 class="menu-group">{t('ui.more.group.work')}</h2>
        <button class="row" data-testid="open-register" onClick={() => setView('register')}><MenuIcon name="register" /><span>{t('register.open')}</span><span aria-hidden="true" class="chev" /></button>
        <button class="row" data-testid="open-orders" onClick={() => setView('orders')}><MenuIcon name="orders" /><span>{t('orders.open')}</span><span aria-hidden="true" class="chev" /></button>
        <button class="row" data-testid="open-stock" onClick={() => { tab.value = 'stock'; }}><MenuIcon name="stock" /><span>{t('tab.stock')}</span><span aria-hidden="true" class="chev" /></button>
        {activeFarm.value === DEMO_FARM_ID && <button class="row" data-testid="open-worker-view" onClick={() => { workerView.value = ''; }}><MenuIcon name="worker" /><span>{t('more.workerView')}</span><span aria-hidden="true" class="chev" /></button>}
        <button class="row" data-testid="open-customers" onClick={() => setView('customers')}><MenuIcon name="workers" /><span>{t('ui.cust.open')}</span><span aria-hidden="true" class="chev" /></button>
        <button class="row" data-testid="open-money" onClick={() => setView('money')}><MenuIcon name="money" /><span>{t('ui.money.open')}</span><span aria-hidden="true" class="chev" /></button>
        <button class="row" data-testid="open-workers" onClick={() => setView('workers')}><MenuIcon name="workers" /><span>{t('workers.open')}</span><span aria-hidden="true" class="chev" /></button>
        <h2 class="menu-group">{t('ui.more.group.reports')}</h2>
        <button class="row" data-testid="open-weekly-report" onClick={() => setView('weekly')}><MenuIcon name="register" /><span>{weeklyCopy[lang.value].title}</span><span aria-hidden="true" class="chev" /></button>
        <button class="row" data-testid="open-photos" onClick={() => setView('photos')}><MenuIcon name="photos" /><span>{t('photos.title')}</span><span aria-hidden="true" class="chev" /></button>
        <h2 class="menu-group">{t('ui.more.group.info')}</h2>
        <button class="row" data-testid="open-info" onClick={() => setView('info')}><MenuIcon name="info" /><span>{t('more.info')}</span><span aria-hidden="true" class="chev" /></button>
        <button class="row" data-testid="open-settings" onClick={() => setView('settings')}><MenuIcon name="settings" /><span>{t('more.settings')}</span><span aria-hidden="true" class="chev" /></button>
      </nav>

      <h2>{t('more.language')}</h2>
      <div class="seg">
        {LANGS.map((l) => (
          <button key={l} aria-pressed={lang.value === l} onClick={() => setLang(l)}>{LANG_META[l].label}</button>
        ))}
      </div>
      <p class="muted">{t('more.version', { v: APP_VERSION, name: APP_NAME_EL })}</p>
    </section>
  );
}
