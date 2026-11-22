import { useEffect, useRef } from 'preact/hooks';
import { signal } from '@preact/signals';
import { dirty } from '../pwa/update';

// The Back gesture closes the open sub-screen instead of leaving the app (T7, 2026-11-19). A screen that opens a sub-screen or a form calls `useBack(active, close)`: opening pushes a history entry,
// Back (popstate) calls `close`, and closing from the screen's own button removes the entry again. A form with something typed (`askIfDirty`) first ASKS «Να φύγω χωρίς αποθήκευση;».
export const tabReset = signal(0);                              // bumps when the active tab is tapped again: its sub-screens close
/** How many open screens ask before they are left (a form with its question switched on): a tab tap asks only while one is open. */
export const guarding = signal(0);
export const leaveAsk = signal<{ stay: () => void; go: () => void } | undefined>(undefined);

// ONE popstate listener serves every screen. Each screen that pushed a history entry is on a stack: a Back (popstate) closes ONLY the top-most one, and an entry a screen removes itself (its own close button, a tab tap) is skipped,
// so a sheet opened from a sub-screen closes alone and the sub-screen under it stays open.
interface Entry { handle: () => void }
const stack: Entry[] = [];
let skip = 0;
let listening = false;
function listen(): void {
  if (listening) return;
  listening = true;
  window.addEventListener('popstate', () => {
    if (skip > 0) { skip -= 1; return; }
    stack.pop()?.handle();
  });
}
const isAloni = (): boolean => !!(history.state as { aloni?: number } | null)?.aloni;
/** A screen removes its own entry (it is leaving by itself): the Back this causes must not close anything else. */
function leave(entry: Entry): void {
  const at = stack.lastIndexOf(entry);
  if (at >= 0) stack.splice(at, 1);
  if (isAloni()) { skip += 1; history.back(); }
}

export function useBack(active: boolean, close: () => void, askIfDirty = false): void {
  const pushed = useRef(false);
  const closeRef = useRef(close); closeRef.current = close;
  const dirtyRef = useRef(askIfDirty); dirtyRef.current = askIfDirty;
  const entry = useRef<Entry>({ handle: () => undefined });
  entry.current.handle = () => {
    if (!pushed.current) return;
    if (dirtyRef.current && dirty.value) {
      history.pushState({ aloni: 1 }, '', location.href);        // stay for now: the entry goes back on, and the question is asked
      stack.push(entry.current);
      leaveAsk.value = { stay: () => { leaveAsk.value = undefined; }, go: () => { leaveAsk.value = undefined; pushed.current = false; closeRef.current(); leave(entry.current); } };
      return;
    }
    pushed.current = false; closeRef.current();
  };
  useEffect(() => {
    listen();
    if (active && !pushed.current) { history.pushState({ aloni: 1 }, '', location.href); pushed.current = true; stack.push(entry.current); }
    if (!active && pushed.current) { pushed.current = false; leave(entry.current); }
  }, [active]);
  useEffect(() => () => {      // the screen goes away (another tab, another farm): its history entry and a pending question go with it
    leaveAsk.value = undefined;
    if (pushed.current) { pushed.current = false; leave(entry.current); }
  }, []);
  useEffect(() => {
    if (!(active && askIfDirty)) return undefined;
    guarding.value += 1;
    return () => { guarding.value -= 1; };
  }, [active, askIfDirty]);
  const first = useRef(true);
  useEffect(() => {      // the active tab was tapped again: back to the tab's root
    if (first.current) { first.current = false; return; }
    if (pushed.current) { pushed.current = false; closeRef.current(); leave(entry.current); }
  }, [tabReset.value]);
}
