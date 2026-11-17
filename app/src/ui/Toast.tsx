import { signal } from '@preact/signals';
import { t } from '../i18n';

// Undo instead of a confirm dialog: the action happens at once, and for 5 seconds «Αναίρεση» takes it back.
// A HELD action (the worker view, 10 s) passes `commit`: it runs when the time is up, or at once if another toast replaces this one; never after an undo.
export const UNDO_MS = 5000;
interface ToastState { text: string; onUndo: () => Promise<void> | void; commit?: () => Promise<void> | void }
const toast = signal<ToastState | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;

function schedule(text: string, onUndo: () => Promise<void> | void, ms: number, commit?: () => Promise<void> | void): void {
  clearTimeout(timer);
  void toast.value?.commit?.(); // an earlier held action is committed now, never lost
  toast.value = { text, onUndo, commit };
  timer = setTimeout(() => { const c = toast.value?.commit; toast.value = null; void c?.(); }, ms);
}

export function showUndo(text: string, onUndo: () => Promise<void> | void): void { schedule(text, onUndo, UNDO_MS); }

/** The worker view: nothing is written until `ms` have passed; «Αναίρεση» cancels it completely. */
export function showHeldUndo(text: string, onUndo: () => Promise<void> | void, commit: () => Promise<void> | void, ms: number): void { schedule(text, onUndo, ms, commit); }

export function Toast() {
  const s = toast.value;
  if (!s) return null;
  const undo = () => { clearTimeout(timer); toast.value = null; void s.onUndo(); };
  return (
    <div class="toast" role="status" data-testid="toast">
      <span>{s.text}</span>
      <button class="btn" onClick={undo}>{t('toast.undo')}</button>
    </div>
  );
}
