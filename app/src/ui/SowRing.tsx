import { lang, t } from '../i18n';

// A ring of the 12 months: a month is filled when a planting of this crop was SOWN in it on this farm (the recorded sowing dates). It says what happened, not what to do: no sowing window, no advice.
const MONTHS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
const monthOf = (day: string): number | undefined => (/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(day) ? Number.parseFloat(day.slice(5, 7)) - 1 : undefined);
const name = (m: number): string => new Intl.DateTimeFormat(lang.value, { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, m, 15)));

/** `days` = the recorded sowing days (YYYY-MM-DD) of the crop's plantings. */
export function SowRing({ days }: { days: readonly string[] }) {
  const on = new Set(days.map(monthOf).filter((m): m is number => m !== undefined));
  const listed = MONTHS.filter((m) => on.has(m)).map(name).join(', ');
  return (
    <section data-testid="crop-tips-ring-block">
      <h3>{t('ui.crop.ring.title')}</h3>
      {on.size === 0 ? <p class="muted" data-testid="crop-tips-ring-note">{t('ui.crop.ring.none')}</p> : <>
        <svg viewBox="0 0 100 100" class="sow-ring" role="img" aria-label={t('ui.crop.ring.sr', { months: listed })} data-testid="crop-tips-ring" data-count={on.size}>
          {MONTHS.map((m) => <path key={m} d={arc(m)} class={on.has(m) ? 'sow-on' : 'sow-off'} />)}
        </svg>
        <p class="muted" data-testid="crop-tips-ring-note">{listed}</p>
      </>}
    </section>
  );
}

function arc(m: number): string {
  const a0 = (m / 12) * 2 * Math.PI - Math.PI / 2; const a1 = ((m + 1) / 12) * 2 * Math.PI - Math.PI / 2 - 0.06;
  const p = (a: number, r: number): string => `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`;
  return `M${p(a0, 44)} A44,44 0 0 1 ${p(a1, 44)} L${p(a1, 30)} A30,30 0 0 0 ${p(a0, 30)} Z`;
}
