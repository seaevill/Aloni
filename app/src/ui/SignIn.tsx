import { useEffect, useState } from 'preact/hooks';
import { AUTH_ENABLED, BACKEND } from '../config';
import { adoptFarm } from '../db/adopt';
import { activeFarm, dataVersion, db, realFarmId } from '../db';
import { t, type I18nKey } from '../i18n';
import { RESEND_WAIT_S, cleanCode, codeError, resendLeft, type CodeError } from '../auth/code';
import { claimInvitations, requestCode, session, tokenFor, verifyCode, type Session } from '../auth/gotrue';
import { loadSession, saveSession } from '../auth/store';
import { setSyncFlag } from '../sync/golive';
import { CreateFarm } from './CreateFarm';

const save = saveSession;
const ERR_KEY: Record<CodeError, I18nKey> = { wrong: 'signin.err.wrong', expired: 'signin.err.expired', rate: 'signin.err.rate', server: 'signin.err.server', net: 'signin.err.net', other: 'signin.error' };

/** More → sign-in with an e-mail code (owner and worker alike). Shown only when AUTH_ENABLED. After the first sign-in an open invitation for the address is claimed. */
export function SignIn() {
  const [email, setEmail] = useState(''); const [code, setCode] = useState(''); const [sent, setSent] = useState(false); const [failed, setFailed] = useState<CodeError | undefined>(undefined);
  const [elapsed, setElapsed] = useState(RESEND_WAIT_S);          // whole seconds since the last send; the button is free at 60
  useEffect(() => {
    if (!AUTH_ENABLED) return;
    void loadSession().then(async (s) => {
      if (!s) return;
      if (!session.value) session.value = s;                        // kept even when offline; a dead session is cleared by tokenFor below
      await tokenFor(BACKEND, s, Date.now(), save);                 // a refreshed session is stored by tokenFor itself
    });
  }, []);
  useEffect(() => { if (elapsed >= RESEND_WAIT_S) return; const id = setInterval(() => setElapsed((n) => n + 1), 1000); return () => clearInterval(id); }, [elapsed >= RESEND_WAIT_S]);
  if (!AUTH_ENABLED) return null;
  const ask = async () => { try { await requestCode(BACKEND, email); setSent(true); setFailed(undefined); setElapsed(0); } catch (e) { setFailed(codeError(e)); } };
  const enter = async () => {
    const digits = cleanCode(code); if (!digits) return;
    try { const s = await verifyCode(BACKEND, email, digits, Date.now()); await save(s);
      const farms = await claimInvitations(BACKEND, s.access_token);
      if (farms[0] && (await adoptFarm(db, farms[0])) === 'adopted') { realFarmId.value = farms[0]; activeFarm.value = farms[0]; dataVersion.value++; await setSyncFlag(db, true); } // a worker's fresh phone takes the farm's id
      setFailed(undefined); setSent(false); setElapsed(RESEND_WAIT_S); setCode(''); } catch (e) { setFailed(codeError(e)); }
  };
  if (session.value) return (
    <section class="card" data-testid="signed-in">{t('signin.as', { email: session.value.email })}
      <small data-testid="farm-id">{t('signin.farmId', { id: realFarmId.value })}</small>
      <CreateFarm />
      <button class="btn secondary" onClick={() => void save(undefined)}>{t('signin.out')}</button>
    </section>
  );
  const wait = resendLeft(elapsed);
  const resendLabel = wait > 0 ? t('signin.resend.wait', { s: wait }) : t('signin.resend');
  const errorText = failed ? t(ERR_KEY[failed]) : '';
  return (
    <section class="card" data-testid="sign-in">
      <strong>{t('signin.title')}</strong>
      <label class="field">{t('signin.email')}<input class="input" type="email" value={email} autoComplete="email" onInput={(e) => setEmail((e.target as HTMLInputElement).value)} /></label>
      {!sent && <button class="btn" data-testid="signin-send" onClick={() => void ask()}>{t('signin.send')}</button>}
      {sent && <p class="muted" data-testid="signin-sent">{t('signin.sent', { email: email.trim().toLowerCase() })}</p>}
      {sent && <label class="field">{t('signin.code')}<input class="input" inputMode="numeric" pattern="[0-9]*" value={code} autoComplete="one-time-code" onInput={(e) => setCode((e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6))} /></label>}
      {sent && <button class="btn" data-testid="signin-verify" disabled={!cleanCode(code)} onClick={() => void enter()}>{t('signin.verify')}</button>}
      {sent && <button class="btn secondary" data-testid="signin-resend" disabled={wait > 0} onClick={() => void ask()}>{resendLabel}</button>}
      {failed && <p class="msg error" role="alert" data-testid="signin-error">{errorText}</p>}
    </section>
  );
}
