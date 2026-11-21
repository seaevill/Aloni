import { useEffect, useState } from 'preact/hooks';
import { db } from '../db';
import { clearErrors, formatReport, readErrors, type LoggedError } from '../diag/errorlog';
import { lang, t } from '../i18n';
import { APP_VERSION } from '../version';

// Info → «Αναφορά σφάλματος»: the app's own errors, kept ONLY on this phone. The owner copies a plain-text report and sends it herself; nothing is sent by the app.
export function ErrorReport() {
  const [errors, setErrors] = useState<LoggedError[]>([]); const [copied, setCopied] = useState<'idle' | 'yes' | 'no'>('idle'); const [text, setText] = useState('');
  useEffect(() => { void readErrors(db).then(setErrors); }, []);
  const report = () => formatReport(errors, { version: APP_VERSION, ua: navigator.userAgent, lang: lang.value });
  const copy = async () => { const r = report(); setText(r); try { await navigator.clipboard.writeText(r); setCopied('yes'); } catch { setCopied('no'); } };
  const clear = async () => { await clearErrors(db); setErrors([]); setCopied('idle'); setText(''); };
  return (
    <section data-testid="error-report">
      <h2>{t('ui.diag.title')}</h2>
      <p class="muted">{t('ui.diag.note')}</p>
      <p class="card" data-testid="error-count">{errors.length === 0 ? t('ui.diag.none') : t('ui.diag.count', { n: errors.length })}</p>
      <button type="button" class="btn secondary" data-testid="error-copy" onClick={() => void copy()}>{t('ui.diag.copy')}</button>
      {copied === 'yes' && <p class="msg" role="status" data-testid="error-copied">{t('ui.diag.copied')}</p>}
      {copied === 'no' && <p class="msg error" role="alert">{t('ui.diag.copy.failed')}</p>}
      {text !== '' && <textarea class="input" readOnly rows={6} value={text} data-testid="error-text" onFocus={(e) => (e.target as HTMLTextAreaElement).select()} />}
      {errors.length > 0 && <button type="button" class="btn secondary" data-testid="error-clear" onClick={() => void clear()}>{t('ui.diag.clear')}</button>}
    </section>
  );
}
