import type { ComponentChildren } from 'preact';

/** Neutral metadata (FRAC 28, Λίπασμα): bordered, no icon, no fill, so it never looks like a status. */
export function Tag({ children }: { children: ComponentChildren }) {
  return <span class="ds-tag">{children}</span>;
}
