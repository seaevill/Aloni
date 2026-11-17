import { useEffect, useState } from 'preact/hooks';
import { dataVersion, db, realFarmId } from '../db';
import { t } from '../i18n';
import { putSetting } from '../repo';
import { SOON_SETTING, parseSoonDays, soonTextOf } from '../settings/soon';

/** More → Ρυθμίσεις: how many days before a lot expires the stock screen warns (information only). */
export function SettingsBox() {
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'saved' | 'error'>('idle');
  useEffect(() => { void db.settings.get(SOON_SETTING).then((r) => { const d = parseSoonDays(r?.value); setText(d.known ? String(d.value) : ''); }); }, []);
  const save = async () => {
    const stored = soonTextOf(text);
    if (stored === undefined) { setState('error'); return; }
    await putSetting(db, realFarmId.value, SOON_SETTING, stored);
    dataVersion.value++;
    setState('saved');
  };
  return (
    <>
      <h2>{t('settings.title')}</h2>
      <label class="field">{t('settings.soon')}
        <input class="input" value={text} inputMode="numeric" autoComplete="off" data-testid="soon-days" onInput={(e) => { setText((e.target as HTMLInputElement).value); setState('idle'); }} />
      </label>
      {state === 'error' && <p class="msg error" role="alert">{t('settings.error')}</p>}
      <button class="btn secondary" onClick={() => void save()}>{t('product.save')}</button>
      {state === 'saved' && <p class="msg" role="status" data-testid="settings-saved">{t('settings.saved')}</p>}
    </>
  );
}
