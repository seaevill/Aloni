import { SYNC_CONNECTED } from '../config';
import { pendingOps, unsyncedIds } from '../repo';
import { t, tn } from '../i18n';
import { online } from './sync';

/**
 * Global chip. Without a server (SYNC_CONNECTED = false) it only says, calmly, that the records are saved on this phone and will be sent when an
 * account is connected. With a server: «Εκτός σύνδεσης» and/or «N μη συγχρονισμένα». Hidden when there is nothing to say.
 */
export function SyncChip() {
  const n = pendingOps.value;
  const offline = !online.value;
  let text = '';
  if (!SYNC_CONNECTED) text = [offline ? t('sync.offline') : '', n > 0 ? t('sync.local') : ''].filter(Boolean).join(' · ');
  else if (offline && n > 0) text = t('sync.both', { offline: t('sync.offline'), pending: tn('sync.pending', n) });
  else if (offline) text = t('sync.offline');
  else if (n > 0) text = tn('sync.pending', n);
  if (!text) return null;
  return <p class={SYNC_CONNECTED ? 'chip' : 'chip calm'} role="status" data-testid="sync-chip">{text}</p>;
}

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
