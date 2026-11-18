import { useState } from 'preact/hooks';
import { activeFarm, dataVersion, deleteDemo, farmLabel, hasDemo, legacyKept, loadDemo, realFarmId } from '../db';
import { DEMO_FARM_ID } from '../config';
import { APP_VERSION } from '../version';
import { LANGS, lang, setLang, t } from '../i18n';

import { Info } from './Info';
import { Photos } from './Photos';
import { SettingsBox } from './SettingsBox';
import { Register } from './Register';
import { Workers } from './Workers';
import { workerView } from './nav';
import { Backup } from './Backup';
import { SignIn } from './SignIn';
import { showUndo } from './Toast';

export function More() {
  const [msg, setMsg] = useState('');
  const [view, setView] = useState<'main' | 'info' | 'photos' | 'workers' | 'register'>('main');
  const pick = (id: string) => { activeFarm.value = id; dataVersion.value++; };
  if (view === 'info') return <Info onBack={() => setView('main')} />;
  if (view === 'register') return <Register onBack={() => setView('main')} />;
  if (view === 'workers') return <Workers onBack={() => setView('main')} />;
  if (view === 'photos') return <Photos onBack={() => setView('main')} />;
  return (
    <section>
      <h1>{t('more.title')}</h1>

      <h2>{t('more.language')}</h2>
      <div class="seg">
        {LANGS.map((l) => (
          <button key={l} aria-pressed={lang.value === l} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
        ))}
      </div>

      <h2>{t('more.activeFarm')}</h2>
      <div class="seg two">
        {[realFarmId.value, ...(hasDemo.value ? [DEMO_FARM_ID] : [])].map((id) => (
          <button key={id} aria-pressed={activeFarm.value === id} onClick={() => pick(id)}>{farmLabel(id)}</button>
        ))}
      </div>

      <button class="btn" onClick={async () => { await loadDemo(); setMsg(t('more.demoLoaded')); }}>{t('more.loadDemo')}</button>
      {hasDemo.value && (
        <button class="btn danger" onClick={async () => { await deleteDemo(); showUndo(t('more.demoRemoved'), loadDemo); }}>{t('more.removeDemo')}</button>
      )}
      <p class="muted">{t('more.demoNote')}</p>
      {msg && <p class="msg" role="status">{msg}</p>}
      <SignIn />
      <Backup />
      <SettingsBox />
      {activeFarm.value === DEMO_FARM_ID && <button class="btn secondary" data-testid="open-worker-view" onClick={() => { workerView.value = ''; }}>{t('more.workerView')}</button>}
      <button class="btn secondary" data-testid="open-register" onClick={() => setView('register')}>{t('register.open')}</button>
      <button class="btn secondary" data-testid="open-workers" onClick={() => setView('workers')}>{t('workers.open')}</button>
      <button class="btn secondary" data-testid="open-photos" onClick={() => setView('photos')}>{t('photos.title')}</button>
      <button class="btn secondary" data-testid="open-info" onClick={() => setView('info')}>{t('more.info')}</button>
      {legacyKept.value && <p class="draft" role="note">{t('more.legacyKept')}</p>}
      <p class="muted">{t('more.version', { v: APP_VERSION })}</p>
    </section>
  );
}
