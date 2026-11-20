import { useEffect, useState } from 'preact/hooks';
import { BACKEND } from '../config';
import { db, realFarmId } from '../db';
import { t, type I18nKey } from '../i18n';
import { createFirstFarm, FarmRefused, myFarmIds, session, tokenFor, type FarmRefusal } from '../auth/gotrue';
import { saveSession } from '../auth/store';
import { BUSINESS_KEY, type Business } from '../settings/readiness';
import { useSubmit } from './useSubmit';

const ERROR_KEYS: Record<FarmRefusal | 'generic' | 'name', I18nKey> = {
  one_farm: 'farm.create.error.one', member: 'farm.create.error.member', invited: 'farm.create.error.invited', limit: 'farm.create.error.limit',
  confirm: 'farm.create.error.confirm', other: 'farm.create.error.generic', generic: 'farm.create.error.generic', name: 'farm.create.error.name',
};

/** «Δημιουργία κτήματος»: a signed-in person who belongs to NO farm sets up their first one (migration 0034). Shown only when the server said «no farm yet»; an unknown answer shows nothing. Sync is NOT switched on here. */
export function CreateFarm() {
  const { busy, submit } = useSubmit();
  const [state, setState] = useState<'checking' | 'none' | 'has' | 'unknown' | 'done'>('checking');
  const [name, setName] = useState('');
  const [error, setError] = useState<FarmRefusal | 'generic' | 'name' | undefined>(undefined);
  useEffect(() => { void db.settings.get(BUSINESS_KEY).then((r) => { const n = (r?.value as Business | undefined)?.farm_name; if (n) setName(n); }); }, []);
  const check = async () => {
    try {
      const token = await tokenFor(BACKEND, session.value, Date.now(), saveSession);
      if (!token) { setState('unknown'); return; }
      setState((await myFarmIds(BACKEND, token)).length === 0 ? 'none' : 'has');
    } catch { setState('unknown'); }
  };
  useEffect(() => { void check(); }, [session.value?.user_id]);
  const create = async () => {
    if (name.trim() === '') { setError('name'); return; }
    try {
      const token = await tokenFor(BACKEND, session.value, Date.now(), saveSession);
      if (!token) { setError('generic'); return; }
      await createFirstFarm(BACKEND, token, realFarmId.value, name);
      setError(undefined); setState('done');
    } catch (e) { setError(e instanceof FarmRefused ? e.reason : 'generic'); if (e instanceof FarmRefused && (e.reason === 'member' || e.reason === 'one_farm')) void check(); }
  };
  if (state === 'done') return <p class="msg" role="status" data-testid="farm-created">{t('farm.create.done')}</p>;
  if (state !== 'none') return null;
  return (
    <div class="card" data-testid="create-farm">
      <strong>{t('farm.create.title')}</strong>
      <p class="muted">{t('farm.create.note')}</p>
      <label class="field">{t('farm.create.name')}<input class="input" value={name} autoComplete="off" data-testid="create-farm-name" onInput={(e) => setName((e.target as HTMLInputElement).value)} /></label>
      {error && <p class="msg error" role="alert" data-testid="create-farm-error">{t(ERROR_KEYS[error])}</p>}
      <button class="btn" data-testid="create-farm-go" disabled={busy} onClick={() => void submit(create)}>{t('farm.create.button')}</button>
    </div>
  );
}
