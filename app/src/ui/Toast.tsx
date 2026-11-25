import { signal } from '@preact/signals';
import { t } from '../i18n';
import { savedWhereNow } from './states';

// Undo instead of a confirm dialog: the action happens at once, and for 5 seconds «Αναίρεση» takes it back.
// A HELD action (the worker view, 10 s) passes `commit`: it runs when the time is up, or at once if another toast replaces this one; never after an undo.
export const UNDO_MS = 5000;
interface ToastState { text: string; onUndo: () => Promise<void> | void; commit?: () => Promise<void> | void; where?: boolean }
const toast = signal<ToastState | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;

function schedule(text: string, onUndo: () => Promise<void> | void, ms: number, commit?: () => Promise<void> | void, where?: boolean): void {
  clearTimeout(timer);
  void toast.value?.commit?.(); // an earlier held action is committed now, never lost
  toast.value = { text, onUndo, commit, where };
  timer = setTimeout(() => { const c = toast.value?.commit; toast.value = null; void c?.(); }, ms);
}

/** `where`: a NEW farm record was saved, so the toast also says where it is now («on the phone …», queue item 6b); nothing for the Demo farm or once sync has sent it. */
export function showUndo(text: string, onUndo: () => Promise<void> | void, opts?: { where?: boolean }): void { schedule(text, onUndo, UNDO_MS, undefined, opts?.where); }

/** The worker view: nothing is written until `ms` have passed; «Αναίρεση» cancels it completely. */
export function showHeldUndo(text: string, onUndo: () => Promise<void> | void, commit: () => Promise<void> | void, ms: number): void { schedule(text, onUndo, ms, commit); }

/** A person who focuses or points at the toast gets the time to read it: the timer stops (the held worker action is committed by the next toast or the app start, never lost). */
function pause(): void { if (toast.value && !toast.value.commit) clearTimeout(timer); }      // a HELD worker action (it has a commit) is never paused: its 10 s stay exactly as T4 made them
function resume(): void { const s = toast.value; if (s && !s.commit) { clearTimeout(timer); timer = setTimeout(() => { toast.value = null; }, UNDO_MS); } }

export function Toast() {
  const s = toast.value;
  const undo = () => { if (!s) return; clearTimeout(timer); toast.value = null; void s.onUndo(); };
  const whereKey = s?.where ? savedWhereNow() : undefined;
  return (
    <>
      <div class="sr-only" aria-live="polite" aria-atomic="true" data-testid="toast-live">{s?.text}{whereKey && ` ${t(whereKey)}`}</div>
      {s && (
        <div class="toast" data-testid="toast" onFocusIn={pause} onFocusOut={resume}>
          <span>{s.text}{whereKey && <small class="toast-where" data-testid="toast-saved-where">{t(whereKey)}</small>}</span>
          <button class="btn" onClick={undo}>{t('toast.undo')}</button>
        </div>
      )}
    </>
  );
}
