import { t } from '../../i18n';
import { formatQty } from '../../i18n/format';
import { sparklineSegments, weekDelta, weekScale, type Week } from './dataviz';

const NBSP = ' ';

/** One big number (44 or 24): label above, value, unit joined to it by a no-break space. A missing value is «άγνωστο» in muted 22/700: never 0 and never a lone dash. `value` is already formatted by the caller. */
export function BigNum({ value, unit, caption, size = 'big' }: { value: string | undefined; unit?: string; caption: string; size?: 'big' | 'small' }) {
  const known = value !== undefined && value !== '';
  const shown = known ? (unit !== undefined ? `${value}${NBSP}${unit}` : value) : t('ui.unknown');
  return (
    <div class="ds-bignum" data-size={size} data-known={known ? 'yes' : 'no'}>
      <span class="ds-bignum-caption">{caption}</span>
      <span class="ds-bignum-value">{shown}</span>
    </div>
  );
}

/** 120×32, a 2 px line, no axes, no fill; the last known point is a lime dot with a forest ring. The text label is REQUIRED (the line never stands alone). Logged values only; null = a gap. */
export function Sparkline({ values, caption }: { values: ReadonlyArray<number | null>; caption: string }) {
  const { segments, last } = sparklineSegments(values, 120, 32);
  return (
    <figure class="ds-spark">
      <svg viewBox="0 0 120 32" width="120" height="32" aria-hidden="true" focusable="false">
        {segments.filter((s) => s.length > 1).map((s, i) => <polyline key={i} points={s.map((p) => p.join(',')).join(' ')} class="ds-spark-line" />)}
        {segments.filter((s) => s.length === 1).map((s, i) => <circle key={`d${i}`} cx={s[0]![0]} cy={s[0]![1]} r="1.5" class="ds-spark-solo" />)}
        {last !== undefined && <circle cx={last[0]} cy={last[1]} r="3" class="ds-spark-end" />}
      </svg>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

const hatchId = (i: number): string => `ds-hatch-${i}`;
export interface WeekBar extends Week { name: string }
/** Orders against supply, one row per week. The bar is ELIGIBLE supply only; held/unknown supply is a separate hatched segment labelled «άγνωστο» and is never added to it. Short or extra is stated in words with an icon-like mark, never by colour alone. */
export function WeekBars({ weeks }: { weeks: readonly WeekBar[] }) {
  const scale = weekScale(weeks);
  if (scale === undefined) return <p class="ds-muted" data-testid="weekbars-empty">{t('ui.week.nodata')}</p>;
  const pct = (v: number): string => `${(v / scale) * 100}%`;
  return (
    <div class="ds-weeks">
      {weeks.map((w, i) => {
        const d = weekDelta(w.orders, w.eligible);
        const line = d === undefined ? '' : d.kind === 'short' ? t('ui.week.short', { n: formatQty(d.n) }) : d.kind === 'extra' ? t('ui.week.extra', { n: formatQty(d.n) }) : t('ui.week.even');
        const hatch = hatchId(i);
        const unknownFrom = w.eligible === null ? undefined : pct(w.eligible);   // the hatched part starts where the eligible bar ends (undefined = at the left edge)
        return (
          <div class="ds-week" key={w.name} data-testid="week">
            <span class="ds-week-caption">{w.name}</span>
            {/* the track is an SVG so the widths are attributes, never inline styles (tokens.test); 100 % = the largest known number of all weeks */}
            <svg class="ds-week-track" width="100%" height="56" aria-hidden="true" focusable="false">
              <defs><pattern id={hatch} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" class="ds-hatch-line" /></pattern></defs>
              {w.eligible !== null && <rect x="0" y="30" width={pct(w.eligible)} height="24" rx="8" class="ds-week-bar" data-testid="week-eligible" />}
              {w.unknown !== null && <rect x={unknownFrom} y="30" width={pct(w.unknown)} height="24" rx="8" fill={`url(#${hatch})`} class="ds-week-hatch" data-testid="week-unknown" />}
              {w.orders !== null && <g data-testid="week-orders"><rect x={pct(w.orders)} y="16" width="3" height="40" class="ds-week-mark" /><text x={pct(w.orders)} y="12" text-anchor="middle" class="ds-week-num">{formatQty(w.orders)}</text></g>}
            </svg>
            {w.unknown !== null && <small class="ds-week-note">{t('ui.week.unknown')}</small>}
            {line !== '' && <span class="ds-week-delta" data-testid="week-delta" data-kind={d?.kind}>{line}</span>}
          </div>
        );
      })}
    </div>
  );
}

export interface WeatherDay { name: string; tmax?: string; tmin?: string; rain?: string; wind?: string }
/** A compact table of days. A day with NO values shows «άγνωστο» ONCE for the whole row (not in every cell); a missing single value is simply left out. */
export function WeatherStrip({ days }: { days: readonly WeatherDay[] }) {
  return (
    <table class="ds-weather" data-testid="ds-weather">
      <tbody>
        {days.map((d) => {
          const none = d.tmax === undefined && d.tmin === undefined && d.rain === undefined && d.wind === undefined;
          return none
            ? <tr key={d.name} data-known="no"><th scope="row">{d.name}</th><td colSpan={4} class="ds-unknown">{t('ui.unknown')}</td></tr>
            : <tr key={d.name} data-known="yes"><th scope="row">{d.name}</th><td>{d.tmax}</td><td>{d.tmin}</td><td>{d.rain}</td><td>{d.wind}</td></tr>;
        })}
      </tbody>
    </table>
  );
}
