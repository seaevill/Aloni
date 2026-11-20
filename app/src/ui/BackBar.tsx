import { useLayoutEffect } from 'preact/hooks';
import { t } from '../i18n';

/** The fixed bar at the top of a screen that was opened from a list: a back chevron (‹) and one word. Replaces the full-width «Επιστροφή» button at the bottom. */
/**
 * A screen opened from a list: its heading takes the focus when it opens (a screen-reader user hears where she is), and when it closes the focus goes back to the
 * row that opened it. The opener is found again by its test id and its text, because the list is drawn anew after the screen closes.
 */
/** The last button tapped: when a screen opens, that was the row that opened it (the row itself is gone from the page by then). */
let lastTapped: { id: string | undefined; label: string } | undefined;
if (typeof document !== 'undefined') document.addEventListener('click', (e) => { const b = (e.target as HTMLElement | null)?.closest('button'); if (b) lastTapped = { id: b.dataset.testid, label: b.textContent ?? '' }; }, true);

function useFocusHeading(): void {
  // Focus during commit, before a delayed effect can interrupt typing.
  useLayoutEffect(() => {
    const id = lastTapped?.id; const label = lastTapped?.label ?? '';
    const h1 = document.querySelector<HTMLElement>('main h1');
    h1?.focus({ preventScroll: true });      // the heading of such a screen has tabIndex={-1}: focusable by a script, not a tab stop
    return () => {
      requestAnimationFrame(() => {
        const rows = [...document.querySelectorAll<HTMLElement>('main button')];
        (rows.find((b) => b.dataset.testid === id && b.textContent === label) ?? rows.find((b) => b.textContent === label))?.focus({ preventScroll: true });
      });
    };
  }, []);
}

export function BackBar({ onBack, testId }: { onBack: () => void; testId?: string }) {
  useFocusHeading();
  return (
    <div class="topbar">
      <button class="back" data-testid={testId} onClick={onBack}><span aria-hidden="true" class="chev back-chev" /><span>{t('info.back')}</span></button>
    </div>
  );
}
