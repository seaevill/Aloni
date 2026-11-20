import { useEffect, useState } from 'preact/hooks';
import { AUTH_ENABLED, BACKEND } from '../config';
import { adoptFarm } from '../db/adopt';
import { activeFarm, dataVersion, db, realFarmId } from '../db';
import { t } from '../i18n';
import { claimInvitations, requestCode, session, tokenFor, verifyCode, type Session } from '../auth/gotrue';
import { loadSession, saveSession } from '../auth/store';
import { setSyncFlag } from '../sync/golive';
import { CreateFarm } from './CreateFarm';

const save = saveSession;

/** More → sign-in with an e-mail code (owner and worker alike). Shown only when AUTH_ENABLED. After the first sign-in an open invitation for the address is claimed. */
export function SignIn() {
  const [email, setEmail] = useState(''); const [code, setCode] = useState(''); const [sent, setSent] = useState(false); const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!AUTH_ENABLED) return;
    void loadSession().then(async (s) => {
      if (!s) return;
      if (!session.value) session.value = s;                        // kept even when offline; a dead session is cleared by tokenFor below
      await tokenFor(BACKEND, s, Date.now(), save);                 // a refreshed session is stored by tokenFor itself
    });
  }, []);
  if (!AUTH_ENABLED) return null;
  const ask = async () => { try { await requestCode(BACKEND, email); setSent(true); setFailed(false); } catch { setFailed(true); } };
  const enter = async () => {
    try { const s = await verifyCode(BACKEND, email, code, Date.now()); await save(s);
      const farms = await claimInvitations(BACKEND, s.access_token);
      if (farms[0] && (await adoptFarm(db, farms[0])) === 'adopted') { realFarmId.value = farms[0]; activeFarm.value = farms[0]; dataVersion.value++; await setSyncFlag(db, true); } // a worker's fresh phone takes the farm's id
      setFailed(false); setSent(false); setCode(''); } catch { setFailed(true); }
  };
  if (session.value) return (
    <section class="card" data-testid="signed-in">{t('signin.as', { email: session.value.email })}
      <small data-testid="farm-id">{t('signin.farmId', { id: realFarmId.value })}</small>
      <CreateFarm />
      <button class="btn secondary" onClick={() => void save(undefined)}>{t('signin.out')}</button>
    </section>
  );
  return (
    <section class="card" data-testid="sign-in">
      <strong>{t('signin.title')}</strong>
      <label class="field">{t('signin.email')}<input class="input" type="email" value={email} autoComplete="email" onInput={(e) => setEmail((e.target as HTMLInputElement).value)} /></label>
      {!sent && <button class="btn" data-testid="signin-send" onClick={() => void ask()}>{t('signin.send')}</button>}
      {sent && <label class="field">{t('signin.code')}<input class="input" inputMode="numeric" value={code} autoComplete="one-time-code" onInput={(e) => setCode((e.target as HTMLInputElement).value)} /></label>}
      {sent && <button class="btn" data-testid="signin-verify" onClick={() => void enter()}>{t('signin.verify')}</button>}
      {failed && <p class="msg error" role="alert">{t('signin.error')}</p>}
    </section>
  );
}
