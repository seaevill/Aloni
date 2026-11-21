import type { ComponentChildren } from 'preact';
import { Icon, type IconName } from '../icons/Icon';

/** The eight statuses of the sprint (§1.5). The icon, the word and the fill all differ between tones: colour is never the only signal. The words come from the caller (rules-core statusOf decides the tone; the chip only shows it). */
export const TONES = ['hold', 'blocked', 'warn', 'unsigned', 'frost', 'ready', 'unknown', 'info'] as const;
export type Tone = (typeof TONES)[number];
export const TONE_ICON: Record<Tone, IconName> = { hold: 'hourglass', blocked: 'lock', warn: 'clock', unsigned: 'pen-off', frost: 'snowflake', ready: 'sickle', unknown: 'question', info: 'info' };

export function Chip({ tone, children }: { tone: Tone; children: ComponentChildren }) {
  return <span class="ds-chip" data-tone={tone}><Icon name={TONE_ICON[tone]} size="var(--icon-sm)" /><span>{children}</span></span>;
}
