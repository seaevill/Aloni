import { useEffect, useState } from 'preact/hooks';
import { LANG_META, t, type Lang } from '../i18n';
import { inviteLink } from '../auth/invite-link';
import { encodeQr, type Qr } from '../auth/qr';
import { DetailSheet } from './ds/DetailSheet';
import { Icon } from './icons/Icon';
import { nameOf } from './screens';
import { registerSheet, type SheetProps } from './sheets';
import { useRows } from './useRows';

// E4: the worker invitation made easy. The owner shows a QR code (or copies/shares the link); the worker opens it on her own phone, in her language (Hindi unless the owner picks another), and signs in with her e-mail and the 6-digit code.
// The link carries ONLY the language. It gives no access by itself: the invitation by e-mail (the form above) is still what lets her in, and the sheet says so.
const CHOICES: readonly Lang[] = ['hi', 'el', 'tr', 'en'];
const LANG_NAME = { el: 'lang.name.el', tr: 'lang.name.tr', en: 'lang.name.en', hi: 'lang.name.hi' } as const;

function QrImage({ qr }: { qr: Qr }) {
  const q = 4;                                                            // the quiet zone: 4 light modules all round
  const path = qr.modules.flatMap((row, y) => { const runs: string[] = []; for (let x = 0; x < row.length; x++) { if (!row[x]) continue; let e = x; while (e < row.length && row[e]) e++; runs.push(`M${x + q} ${y + q}h${e - x}v1h-${e - x}z`); x = e; } return runs; }).join('');
  return (
    <svg class="invite-qr" viewBox={`0 0 ${qr.size + 2 * q} ${qr.size + 2 * q}`} role="img" aria-label={t('ui.invite.qr.alt')} data-testid="invite-qr" shape-rendering="crispEdges">
      <rect width="100%" height="100%" class="invite-qr-bg" /><path d={path} class="invite-qr-ink" />
    </svg>
  );
}

function InviteSheet({ id, close }: SheetProps) {
  const workers = useRows('workers');
  const worker = (workers.rows ?? []).find((w) => w.id === id);
  const [lang, setLang] = useState<Lang>('hi');
  const [copied, setCopied] = useState<'idle' | 'yes' | 'no'>('idle');
  const link = inviteLink(location.origin, lang);
  const [qr, setQr] = useState<Qr | undefined>(undefined);
  useEffect(() => { try { setQr(encodeQr(link)); } catch { setQr(undefined); } }, [link]);
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied('yes'); } catch { setCopied('no'); } };
  const canShare = typeof navigator.share === 'function';
  return (
    <DetailSheet heading={t('ui.invite.title')} icon={<Icon name="users" />} onClose={close} testid="sheet-invite">
      {worker && <p class="ds-muted" data-testid="invite-for">{t('ui.invite.for', { name: nameOf(worker) })}</p>}
      <div class="seg big" role="group" aria-label={t('ui.invite.lang')} data-testid="invite-lang">
        {CHOICES.map((l) => <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => { setLang(l); setCopied('idle'); }}>{LANG_META[l].label}<span class="sr-only"> {t(LANG_NAME[l])}</span></button>)}
      </div>
      {qr ? <QrImage qr={qr} /> : <p class="ds-muted" data-testid="invite-qr-none">{t('ui.invite.qr.none')}</p>}
      <label class="field">{t('ui.invite.link')}<input class="input" readOnly value={link} data-testid="invite-link" onFocus={(e) => (e.target as HTMLInputElement).select()} /></label>
      <button type="button" class="btn" data-testid="invite-copy" onClick={() => void copy()}>{t('ui.invite.copy')}</button>
      {canShare && <button type="button" class="btn secondary" data-testid="invite-share" onClick={() => void navigator.share({ url: link }).catch(() => undefined)}>{t('ui.invite.share')}</button>}
      {copied === 'yes' && <p class="msg" role="status" data-testid="invite-copied">{t('ui.invite.copied')}</p>}
      {copied === 'no' && <p class="msg error" role="alert">{t('ui.invite.copy.failed')}</p>}
      <h3>{t('ui.invite.steps')}</h3>
      <ol class="ds-steps"><li>{t('ui.invite.step1')}</li><li>{t('ui.invite.step2')}</li><li>{t('ui.invite.step3')}</li></ol>
      <p class="ds-muted" data-testid="invite-note">{t('ui.invite.note')}</p>
    </DetailSheet>
  );
}
registerSheet('invite', InviteSheet);
