import { useEffect, useState } from 'preact/hooks';
import { AUTH_ENABLED, BACKEND } from '../config';
import { db } from '../db';
import { t } from '../i18n';
import { claimInvitations, requestCode, session, tokenFor, verifyCode, type Session } from '../auth/gotrue';
import { putLocal } from '../repo';

const KEY = 'auth_session';
const save = async (s: Session | undefined) => { session.value = s; await putLocal(db, KEY, s ?? null); };

/** More → sign-in with an e-mail code (owner and worker alike). Shown only when AUTH_ENABLED. After the first sign-in an open invitation for the address is claimed. */
export function SignIn() {
  const [email, setEmail] = useState(''); const [code, setCode] = useState(''); const [sent, setSent] = useState(false); const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!AUTH_ENABLED) return;
    void db.settings.get(KEY).then(async (r) => {
      const s = (r?.value as Session | null) ?? undefined;
      if (!s) return;
      const token = await tokenFor(BACKEND, s, Date.now(), save); // a refreshed session is stored by tokenFor itself
      if (token && !session.value) session.value = s;               // still valid: no refresh was needed
    });
  }, []);
  if (!AUTH_ENABLED) return null;
  const ask = async () => { try { await requestCode(BACKEND, email); setSent(true); setFailed(false); } catch { setFailed(true); } };
  const enter = async () => {
    try { const s = await verifyCode(BACKEND, email, code, Date.now()); await save(s); await claimInvitations(BACKEND, s.access_token); setFailed(false); setSent(false); setCode(''); } catch { setFailed(true); }
  };
  if (session.value) return (
    <section class="card" data-testid="signed-in">{t('signin.as', { email: session.value.email })}
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
