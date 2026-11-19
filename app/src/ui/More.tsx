import { useState } from 'preact/hooks';
import { useBack } from './backstack';
import { activeFarm, dataVersion, deleteDemo, farmLabel, hasDemo, legacyKept, loadDemo, realFarmId } from '../db';
import { DEMO_FARM_ID } from '../config';
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

export function More() {
  const [msg, setMsg] = useState('');
  const [view, setView] = useState<'main' | 'info' | 'photos' | 'workers' | 'register' | 'orders'>('main');
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  const openedFrom = [t(standalone ? 'more.openedFrom.home' : 'more.openedFrom.safari'), t('more.openedFrom.note')].join(' ');
  const demoLabel = t(hasDemo.value ? 'more.resetDemo' : 'more.loadDemo');
  useBack(view !== 'main', () => setView('main'));
  const pick = (id: string) => { activeFarm.value = id; dataVersion.value++; };
  if (view === 'info') return <Info onBack={() => setView('main')} />;
  if (view === 'orders') return <Orders onBack={() => setView('main')} />;
  if (view === 'register') return <Register onBack={() => setView('main')} />;
  if (view === 'workers') return <Workers onBack={() => setView('main')} />;
  if (view === 'photos') return <Photos onBack={() => setView('main')} />;
  return (
    <section>
      <header class="today-head band"><h1>{t('more.title')}</h1></header>
      <nav class="menu" data-testid="more-menu" aria-label={t('more.menu')}>
        {activeFarm.value === DEMO_FARM_ID && <button class="row" data-testid="open-worker-view" onClick={() => { workerView.value = ''; }}><span>{t('more.workerView')}</span><span aria-hidden="true" class="chev" /></button>}
        <button class="row" data-testid="open-orders" onClick={() => setView('orders')}><span>{t('orders.open')}</span><span aria-hidden="true" class="chev" /></button>
        <button class="row" data-testid="open-register" onClick={() => setView('register')}><span>{t('register.open')}</span><span aria-hidden="true" class="chev" /></button>
        <button class="row" data-testid="open-workers" onClick={() => setView('workers')}><span>{t('workers.open')}</span><span aria-hidden="true" class="chev" /></button>
        <button class="row" data-testid="open-photos" onClick={() => setView('photos')}><span>{t('photos.title')}</span><span aria-hidden="true" class="chev" /></button>
        <button class="row" data-testid="open-info" onClick={() => setView('info')}><span>{t('more.info')}</span><span aria-hidden="true" class="chev" /></button>
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
      <p class="muted">{t('more.version', { v: APP_VERSION })}</p>
      <details class="card" data-testid="dev-section">
        <summary>{t('dev.title')}</summary>
        <Readiness part="dev" />
      </details>
    </section>
  );
}
