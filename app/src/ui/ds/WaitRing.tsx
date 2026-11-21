import { t, tn } from '../../i18n';

/**
 * The waiting-period ring: a forest fill on a lime-soft ground, the whole days left in the middle (rounded UP) and, in the big form, the percent elapsed below (rounded DOWN). It is drawn ONLY for a running wait whose
 * dates can be read; unknown or finished waits show a chip with the reason instead of a ring. `big` is the sheet size, the small one sits in a list row.
 */
export function WaitRing({ daysLeft, percent, big = false }: { daysLeft: number; percent: number; big?: boolean }) {
  return (
    <div class="ds-ring" data-size={big ? 'lg' : 'sm'} data-testid="wait-ring" data-days={daysLeft} data-percent={percent} role="img" aria-label={t('ui.ring.sr', { d: daysLeft, p: percent })}>
      <svg class={big ? 'ds-size-art' : 'ds-size-tile'} viewBox="0 0 100 100" fill="none" aria-hidden="true" focusable="false">
        <circle cx="50" cy="50" r="42" class="ds-ring-track" />
        <circle cx="50" cy="50" r="42" class="ds-ring-fill" pathLength="100" stroke-dasharray={`${percent} 100`} transform="rotate(-90 50 50)" />
      </svg>
      <span class="ds-ring-center"><span class="ds-ring-days">{daysLeft}</span>{big && <span class="ds-ring-unit">{tn('ui.ring.days', daysLeft)}</span>}</span>
      {big && <span class="ds-ring-pct">{t('ui.ring.elapsed', { p: percent })}</span>}
    </div>
  );
}
