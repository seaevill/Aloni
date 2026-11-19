import { useEffect, useRef } from 'preact/hooks';
import { signal } from '@preact/signals';
import { dirty } from '../pwa/update';

// The Back gesture closes the open sub-screen instead of leaving the app (T7, 2026-11-19). A screen that opens a sub-screen or a form calls `useBack(active, close)`: opening pushes a history entry,
// Back (popstate) calls `close`, and closing from the screen's own button removes the entry again. A form with something typed (`askIfDirty`) first ASKS «Να φύγω χωρίς αποθήκευση;».
export const tabReset = signal(0);                              // bumps when the active tab is tapped again: its sub-screens close
/** How many open screens ask before they are left (a form with its question switched on): a tab tap asks only while one is open. */
export const guarding = signal(0);
export const leaveAsk = signal<{ stay: () => void; go: () => void } | undefined>(undefined);

export function useBack(active: boolean, close: () => void, askIfDirty = false): void {
  const pushed = useRef(false);
  const closeRef = useRef(close); closeRef.current = close;
  const dirtyRef = useRef(askIfDirty); dirtyRef.current = askIfDirty;
  useEffect(() => {
    if (active && !pushed.current) { history.pushState({ aloni: 1 }, '', location.href); pushed.current = true; }
    if (!active && pushed.current) { pushed.current = false; if ((history.state as { aloni?: number } | null)?.aloni) history.back(); }
  }, [active]);
  useEffect(() => {
    const onPop = () => {
      if (!pushed.current) return;
      if (dirtyRef.current && dirty.value) {
        history.pushState({ aloni: 1 }, '', location.href);        // stay for now: the entry goes back on, and the question is asked
        leaveAsk.value = { stay: () => { leaveAsk.value = undefined; }, go: () => { leaveAsk.value = undefined; pushed.current = false; closeRef.current(); history.back(); } };
        return;
      }
      pushed.current = false; closeRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => {      // the screen goes away (another tab, another farm): its history entry and a pending question go with it
      window.removeEventListener('popstate', onPop);
      leaveAsk.value = undefined;
      if (pushed.current) { pushed.current = false; if ((history.state as { aloni?: number } | null)?.aloni) history.back(); }
    };
  }, []);
  useEffect(() => {
    if (!(active && askIfDirty)) return undefined;
    guarding.value += 1;
    return () => { guarding.value -= 1; };
  }, [active, askIfDirty]);
  const first = useRef(true);
  useEffect(() => {      // the active tab was tapped again: back to the tab's root
    if (first.current) { first.current = false; return; }
    if (pushed.current) { pushed.current = false; closeRef.current(); if ((history.state as { aloni?: number } | null)?.aloni) history.back(); }
  }, [tabReset.value]);
}
