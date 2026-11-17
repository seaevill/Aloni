import { pendingOps, unsyncedIds } from '../repo';
import { t, tn } from '../i18n';
import { online } from './sync';

/** Global chip: «Εκτός σύνδεσης» and/or «N μη συγχρονισμένα». Hidden only when online with nothing waiting. */
export function SyncChip() {
  const n = pendingOps.value;
  if (online.value && n === 0) return null;
  const text = !online.value && n > 0 ? t('sync.both', { offline: t('sync.offline'), pending: tn('sync.pending', n) }) : !online.value ? t('sync.offline') : tn('sync.pending', n);
  return <p class="chip" role="status" data-testid="sync-chip">{text}</p>;
}

/** The marker on a record that has not reached the server yet: a dot AND a word (colour is never the only signal). */
export function UnsyncedMark({ id }: { id: string }) {
  return unsyncedIds.value.has(id) ? <small class="unsynced"><span class="dot" aria-hidden="true" />{t('sync.unsynced')}</small> : null;
}

export function EmptyState({ message, actionLabel, onAction }: { message: string; actionLabel: string; onAction: () => void }) {
  return (
    <div class="empty" data-testid="empty-state">
      <p>{message}</p>
      <button class="btn" onClick={onAction}>{actionLabel}</button>
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
