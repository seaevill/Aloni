import { useEffect, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { DEMO_FARM_ID, SYNC_CONNECTED } from '../config';
import { pendingOps, rejectedOps, syncMarks } from '../repo';
import { Icon } from './icons/Icon';
import { openSheet } from './nav';
import './RefusedSheet';
import { EmptyArtImage, type EmptyArt } from './illustrations/empty/EmptyArt';
import { t, tn, type I18nKey } from '../i18n';
import { lastSyncOk, syncError } from '../sync/run';
import { syncChip } from '../sync/chip';
import { syncEnabled } from '../sync/golive';
import { savedWhere } from '../sync/saved-where';
import { activeFarm, db } from '../db';
import { online } from './sync';

/**
 * Global chip. Without a server (SYNC_CONNECTED = false) it only says, calmly, that the records are saved on this phone and will be sent when an
 * account is connected. With a server: «Εκτός σύνδεσης» and/or «N μη συγχρονισμένα». Hidden when there is nothing to say.
 */
const CLOCK = new Intl.DateTimeFormat('el-GR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens' });
const athensClock = (iso: string): string => CLOCK.format(new Date(iso));

/** How many «where» lines (under a «saved» confirmation) are on screen: while one says the same sentence as the global chip, the chip stays quiet (queue item 8c: the same sentence twice on the first screen). */
const whereOnScreen = signal(0);

export function SyncChip() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id); }, []);   // «works» ages out by itself
  const n = pendingOps.value;
  const offline = !online.value;
  let text = '';
  if (!SYNC_CONNECTED) text = [offline ? t('sync.offline') : '', n > 0 ? t('sync.local') : ''].filter(Boolean).join(' · ');
  else if (offline && n > 0) text = t('sync.both', { offline: t('sync.offline'), pending: tn('sync.pending', n) });
  else if (offline) text = t('sync.offline');
  else if (n > 0) text = tn('sync.pending', n);
  if (SYNC_CONNECTED && syncError.value) text = [text, t('sync.error')].filter(Boolean).join(' · ');
  const live = syncChip({ connected: SYNC_CONNECTED, enabled: syncEnabled.value, online: online.value, pending: n, rejected: rejectedOps.value.length, failed: syncError.value !== undefined, lastOk: lastSyncOk.value, now }, athensClock);
  if (live) text = live.keys.map((k) => (k.key === 'sync.pending' ? tn('sync.pending', k.n) : k.key === 'sync.refused' ? tn('sync.refused', k.n) : k.key === 'sync.last' ? t('sync.last', k.vars) : t(k.key))).join(' · ');
  const where = savedWhereNow();
  if (whereOnScreen.value > 0 && where !== undefined && text === t(where)) return null;
  if (!text) return null;
  return <p class={live ? `chip ${live.tone}` : SYNC_CONNECTED ? 'chip' : 'chip calm'} role="status" data-testid="sync-chip">{text}</p>;
}

/** The wording under a saved worker record: with a live sync «saved, will be sent when there is signal»; without it the older, calmer line. */
export function queuedKey(live: boolean): I18nKey { if (live) return 'sync.queuedSignal'; return 'worker.queued'; }

/** Under an owner's «saved» confirmation (queue item 6): where the record is now («on the phone, it will be sent …»). Nothing for the Demo farm (never sent) or once sync has emptied the outbox. */
export function SavedWhere({ testid }: { testid: string }) {
  const key = savedWhereNow();
  const shown = key !== undefined;
  useEffect(() => { if (!shown) return undefined; whereOnScreen.value += 1; return () => { whereOnScreen.value -= 1; }; }, [shown]);
  if (key === undefined) return null;
  return <p class="muted" data-testid={testid}>{t(key)}</p>;
}

/** The same «where» key, read from the live signals (the undo toast uses it too, queue item 6b). */
export function savedWhereNow(): I18nKey | undefined {
  return savedWhere({ connected: SYNC_CONNECTED, enabled: syncEnabled.value, pending: pendingOps.value, demo: activeFarm.value === DEMO_FARM_ID });
}

/** The marker on a record (E3): «on the phone» (a dot AND a word), «sent» (a tick AND a word), «refused» (a button that opens the plain explanation). Colour is never the only signal; a record the outbox does not hold has no mark. */
export function UnsyncedMark({ id }: { id: string }) {
  const m = SYNC_CONNECTED ? syncMarks.value.get(id) : undefined;
  if (m === undefined) return null;
  if (m === 'phone') return <small class="unsynced" data-testid="mark-phone"><span class="dot" aria-hidden="true" />{t('sync.unsynced')}</small>;
  if (m === 'sent') return <small class="synced" data-testid="mark-sent"><Icon name="check" />{t('ui.mark.sent')}</small>;
  return <button type="button" class="unsynced refused-mark" data-testid="mark-rejected" onClick={() => openSheet('refused', id)}><span class="dot" aria-hidden="true" />{t('ui.mark.rejected')}</button>;
}

/** An empty list: ONE main action, and optionally a second, weaker one (e.g. «load the demo» after «add a field»). With `art` it shows the 160 px drawing, and with `headline` a 20/800 title above the sentence (design sprint §1.9). */
export function EmptyState({ message, actionLabel, onAction, secondLabel, onSecond, art, headline }: { message: string; actionLabel: string; onAction: () => void; secondLabel?: string; onSecond?: () => void; art?: EmptyArt; headline?: string }) {
  return (
    <div class="empty" data-testid="empty-state">
      {art !== undefined && <EmptyArtImage art={art} />}
      {headline !== undefined && <h2 class="ds-empty-headline">{headline}</h2>}
      <p>{message}</p>
      <button class="btn" onClick={onAction}>{actionLabel}</button>
      {secondLabel && onSecond && <button class="btn secondary" data-testid="empty-second" onClick={onSecond}>{secondLabel}</button>}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div class="empty" role="alert" data-testid="error-state">
      <p>{t('state.error')}</p>
      <button class="btn" onClick={onRetry}>{t('state.retry')}</button>
    </div>
  );
}
