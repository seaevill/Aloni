import { useState } from 'preact/hooks';
import { activeFarm, dataVersion, deleteDemo, farmLabel, hasDemo, loadDemo } from '../db';
import { DEMO_FARM_ID, REAL_FARM_ID } from '../config';
import { APP_VERSION } from '../version';
import { LANGS, lang, setLang, t } from '../i18n';

export function More() {
  const [msg, setMsg] = useState('');
  const pick = (id: string) => { activeFarm.value = id; dataVersion.value++; };
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
      <div class="seg" style="grid-template-columns:1fr 1fr">
        {[REAL_FARM_ID, ...(hasDemo.value ? [DEMO_FARM_ID] : [])].map((id) => (
          <button key={id} aria-pressed={activeFarm.value === id} onClick={() => pick(id)}>{farmLabel(id)}</button>
        ))}
      </div>

      <button class="btn" onClick={async () => { await loadDemo(); setMsg(t('more.demoLoaded')); }}>{t('more.loadDemo')}</button>
      {hasDemo.value && (
        <button class="btn danger" onClick={async () => { await deleteDemo(); setMsg(t('more.demoRemoved')); }}>{t('more.removeDemo')}</button>
      )}
      <p class="muted">{t('more.demoNote')}</p>
      {msg && <p class="msg" role="status">{msg}</p>}
      <p class="muted">{t('more.version', { v: APP_VERSION })}</p>
    </section>
  );
}
