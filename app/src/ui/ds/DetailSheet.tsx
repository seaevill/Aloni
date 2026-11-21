import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { t } from '../../i18n';
import { useBack } from '../backstack';
import { Icon } from '../icons/Icon';

/**
 * The shared bottom sheet: a grab handle, a header (icon or drawing + heading + a 56 px close button) and a scrolling body. Back, Escape, the scrim and a pull down on the handle close it; the close button is always there
 * (workers do not swipe with gloves). It slides up once (no slide under reduced motion). Every sheet explains where a number comes from; an unknown value is written with its reason, never left blank.
 */
export function DetailSheet({ heading, icon, onClose, children, testid, history = true }: { heading: string; icon?: ComponentChildren; onClose: () => void; children: ComponentChildren; testid?: string; history?: boolean }) {
  const head = useRef<HTMLHeadingElement>(null);
  const drag = useRef<number | undefined>(undefined);
  useBack(history, onClose);      // a transient menu that opens another screen passes history={false}: its own history entry would be taken back under the screen it opens
  useEffect(() => {
    head.current?.focus();
    document.body.classList.add('ds-sheet-open');
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.classList.remove('ds-sheet-open'); };
  }, []);
  return (
    <div class="ds-sheet-layer" data-testid={testid ?? 'detail-sheet'}>
      <div class="ds-scrim" data-testid="sheet-scrim" onClick={onClose} />
      <section class="ds-sheet m-sheet" role="dialog" aria-modal="true" aria-labelledby="ds-sheet-title">
        <div class="ds-sheet-grab" data-testid="sheet-handle" onPointerDown={(e) => { drag.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerUp={(e) => { if (drag.current !== undefined && e.clientY - drag.current > 60) onClose(); drag.current = undefined; }}><span class="ds-sheet-handle" aria-hidden="true" /></div>
        <header class="ds-sheet-head">
          {icon !== undefined && <span class="ds-sheet-icon" aria-hidden="true">{icon}</span>}
          <h2 id="ds-sheet-title" tabIndex={-1} ref={head}>{heading}</h2>
          <button type="button" class="ds-sheet-close" data-testid="sheet-close" aria-label={t('ui.sheet.close')} onClick={onClose}><Icon name="x-mark" /></button>
        </header>
        <div class="ds-sheet-body">{children}</div>
      </section>
    </div>
  );
}

/** One «label: value» line of a sheet; an unknown value is written WITH its reason (`unknown`), never blank and never 0. */
export function SheetFact({ name, value, unknown }: { name: string; value?: string; unknown?: string }) {
  const known = value !== undefined && value !== '';
  return (
    <div class="ds-fact" data-known={known ? 'yes' : 'no'}>
      <span class="ds-fact-name">{name}</span>
      <span class="ds-fact-value">{known ? value : unknown ?? t('ui.unknown')}</span>
    </div>
  );
}
