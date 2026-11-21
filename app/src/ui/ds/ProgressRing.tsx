import { t } from '../../i18n';

/**
 * The progress ring of a target (E6): the fill is the percent reached (already rounded DOWN by the caller), the big number in the middle is what REMAINS, the percent sits below.
 * Same look as the waiting-period ring. Drawn only when the done count is known; otherwise the screen shows the reason instead of a ring.
 */
export function ProgressRing({ percent, remaining, unit }: { percent: number; remaining: string; unit: string }) {
  return (
    <div class="ds-ring" data-size="lg" data-testid="target-ring" data-percent={percent} role="img" aria-label={t('ui.target.ring.sr', { r: remaining, p: percent })}>
      <svg class="ds-size-art" viewBox="0 0 100 100" fill="none" aria-hidden="true" focusable="false">
        <circle cx="50" cy="50" r="42" class="ds-ring-track" />
        <circle cx="50" cy="50" r="42" class="ds-ring-fill" pathLength="100" stroke-dasharray={`${percent} 100`} transform="rotate(-90 50 50)" />
      </svg>
      <span class="ds-ring-center"><span class="ds-ring-days">{remaining}</span><span class="ds-ring-unit">{unit}</span></span>
      <span class="ds-ring-pct">{t('ui.target.pct', { p: percent })}</span>
    </div>
  );
}
