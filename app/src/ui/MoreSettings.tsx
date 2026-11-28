import { useState } from 'preact/hooks';
import { activeFarm, dataVersion, deleteDemo, farmLabel, hasDemo, legacyKept, loadDemo, loadDemoSeason, realFarmId } from '../db';
import { DEMO_FARM_ID } from '../config';
import { t } from '../i18n';
import { BackBar } from './BackBar';
import { Backup } from './Backup';
import { GoLive } from './GoLive';
import { Notifications } from './Notifications';
import { Readiness } from './Readiness';
import { SettingsBox } from './SettingsBox';
import { SignIn } from './SignIn';
import { showUndo } from './Toast';
import { setSun, sunMode } from './sunmode';

/** Άλλα → «Ρυθμίσεις και σύνδεση»: everything that used to sit under the menu on the same page (screen, farm, Demo, sign-in, backup, notifications), moved here unchanged so Άλλα itself stays short (is-9). */
export function MoreSettings({ onBack }: { onBack: () => void }) {
  const [msg, setMsg] = useState('');
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  const openedFrom = [t(standalone ? 'more.openedFrom.home' : 'more.openedFrom.safari'), t('more.openedFrom.note')].join(' ');
  const demoLabel = t(hasDemo.value ? 'more.resetDemo' : 'more.loadDemo');
  const pick = (id: string) => { activeFarm.value = id; dataVersion.value++; };
  return (
    <section class="more-v2">
      <BackBar onBack={onBack} />
      <h1 tabIndex={-1}>{t('more.settings')}</h1>
      <h2>{t('ui.sun.title')}</h2>
      <div class="seg two" role="group" aria-label={t('ui.sun.title')} data-testid="sun-toggle">
        <button aria-pressed={!sunMode.value} data-testid="sun-off" onClick={() => void setSun(false)}>{t('ui.sun.off')}</button>
        <button aria-pressed={sunMode.value} data-testid="sun-on" onClick={() => void setSun(true)}>{t('ui.sun.on')}</button>
      </div>
      <p class="muted">{t('ui.sun.note')}</p>

      <h2>{t('more.activeFarm')}</h2>
      <div class="seg two">
        {[realFarmId.value, ...(hasDemo.value ? [DEMO_FARM_ID] : [])].map((id) => (
          <button key={id} aria-pressed={activeFarm.value === id} onClick={() => pick(id)}>{farmLabel(id)}</button>
        ))}
      </div>

      <h2>{t('ui.more.group.demo')}</h2>
      <button class="btn" data-testid="demo-load" onClick={async () => { await loadDemo(); setMsg(t('more.demoLoaded')); }}>{demoLabel}</button>
      <button class="btn secondary" data-testid="demo-season-load" onClick={async () => { await loadDemoSeason(); setMsg(t('more.demoLoaded')); }}>{t('more.demoSeason')}</button>
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
    </section>
  );
}
