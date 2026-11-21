import { tx } from '../../content/tx';

export const UNKNOWN_REASONS = {
  label: 'cx.unknown.missingLabel',
  harvest: 'cx.unknown.missingHarvest',
  area: 'cx.unknown.missingArea',
  date: 'cx.unknown.missingDate',
} as const;

export function UnknownWhy({ reason }: { reason: keyof typeof UNKNOWN_REASONS }) {
  const text = [tx('cx.unknown.label'), tx(UNKNOWN_REASONS[reason])].join(' · ');
  return <small class="cx-source-line" data-testid="unknown-why">{text}</small>;
}
