import { signal } from '@preact/signals';
import { t } from '../i18n';

// Undo instead of a confirm dialog: the action happens at once, and for 5 seconds «Αναίρεση» takes it back.
export const UNDO_MS = 5000;
const toast = signal<{ text: string; onUndo: () => Promise<void> | void } | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;

export function showUndo(text: string, onUndo: () => Promise<void> | void): void {
  clearTimeout(timer);
  toast.value = { text, onUndo };
  timer = setTimeout(() => { toast.value = null; }, UNDO_MS);
}

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
