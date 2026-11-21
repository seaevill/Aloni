import { useEffect, useState } from 'preact/hooks';
import { SYNC_CONNECTED } from '../config';
import { db } from '../db';
import { pendingOps, rejectedOps, unsyncedIds } from '../repo';
import { dismissRejected } from '../repo/sync-apply';
import { t, tn, type I18nKey } from '../i18n';
import { lastSyncOk, syncError } from '../sync/run';
import { syncChip } from '../sync/chip';
import { syncEnabled } from '../sync/golive';
import { online } from './sync';

/**
 * Global chip. Without a server (SYNC_CONNECTED = false) it only says, calmly, that the records are saved on this phone and will be sent when an
 * account is connected. With a server: «Εκτός σύνδεσης» and/or «N μη συγχρονισμένα». Hidden when there is nothing to say.
 */
const CLOCK = new Intl.DateTimeFormat('el-GR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens' });
const athensClock = (iso: string): string => CLOCK.format(new Date(iso));

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
  if (!text) return null;
  return <p class={live ? `chip ${live.tone}` : SYNC_CONNECTED ? 'chip' : 'chip calm'} role="status" data-testid="sync-chip">{text}</p>;
}

/** The records the server REFUSED (only with a live sync): they stay here until the owner has seen them. Never a silent loss. */
export function RejectedList() {
  const rows = rejectedOps.value;
  if (!SYNC_CONNECTED || rows.length === 0) return null;
  return (
    <section class="card blocked" role="alert" data-testid="sync-rejected">
      <strong>{t('sync.rejected.title')}</strong>
      {rows.map((o) => (
        <div class="line" key={o.op_id}>
          <small>{t('sync.rejected.line', { table: o.table, reason: o.reason ?? '' })}</small>
          <button class="btn secondary" onClick={() => void dismissRejected(db, o.op_id)}>{t('sync.rejected.dismiss')}</button>
        </div>
      ))}
    </section>
  );
}

/** The wording under a saved worker record: with a live sync «saved, will be sent when there is signal»; without it the older, calmer line. */
export function queuedKey(live: boolean): I18nKey { if (live) return 'sync.queuedSignal'; return 'worker.queued'; }

/** The marker on a record that has not reached the server yet: a dot AND a word (colour is never the only signal). */
export function UnsyncedMark({ id }: { id: string }) {
  return SYNC_CONNECTED && unsyncedIds.value.has(id) ? <small class="unsynced"><span class="dot" aria-hidden="true" />{t('sync.unsynced')}</small> : null;
}

/** An empty list: ONE main action, and optionally a second, weaker one (e.g. «load the demo» after «add a field»). */
export function EmptyState({ message, actionLabel, onAction, secondLabel, onSecond }: { message: string; actionLabel: string; onAction: () => void; secondLabel?: string; onSecond?: () => void }) {
  return (
    <div class="empty" data-testid="empty-state">
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
