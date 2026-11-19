import { useRef, useState } from 'preact/hooks';

/**
 * One in-flight guard for every save (T3, 2026-11-19: a double tap saved a harvest twice). `submit(fn)` runs `fn` only if no earlier run is still going — the flag is set SYNCHRONOUSLY, before the first
 * await, so two taps in the same moment cannot both pass. The button is `disabled` while `busy`. When `fn` ends (validation failed and the form stays, or an error) the button is free again; after a
 * successful save the form closes and the button is gone.
 */
export function useSubmit(): { busy: boolean; submit: (fn: () => Promise<unknown> | unknown) => Promise<void> } {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const submit = async (fn: () => Promise<unknown> | unknown): Promise<void> => {
    if (running.current) return;
    running.current = true; setBusy(true);
    try { await fn(); } finally { running.current = false; setBusy(false); }
  };
  return { busy, submit };
}
