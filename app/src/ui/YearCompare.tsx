import { t } from '../i18n';
import { formatQty } from '../i18n/format';
import { athensToday } from '../plantings/planting';
import { yearCompare } from '../summary/year-compare';
import type { Row } from '../db/schema';
import './year-compare.css';

// Φυτά › a crop: «Φέτος – πέρυσι»: whole crates per month, this year against last year, from the grower's OWN harvest records. Like with like: last year is also summed up to the same calendar day.
// Information only. No records last year = it says so; nothing is estimated.
export function YearCompare({ cropId, plantings, harvests }: { cropId: string; plantings: readonly Row[]; harvests: readonly Row[] }) {
  const today = athensToday(new Date()) ?? '1970-01-01';
  const y = yearCompare(cropId, plantings, harvests, today);
  const max = Math.max(1, ...y.thisYear.months, ...y.lastYear.months);
  const bar = (n: number): string => `${(n * 100) / max}%`;
  return (
    <section class="card yearcmp" data-testid="year-compare">
      <h3>{t('ui.year.title')}</h3>
      {!y.hasLast && <p class="muted" data-testid="year-nolast">{t('ui.year.nolast')}</p>}
      <div class="yearcmp-sums">
        <div><small>{t('ui.year.this')}</small><strong data-testid="year-this">{t('ui.year.crates', { n: formatQty(y.thisYear.total) })}</strong></div>
        <div><small>{t('ui.year.last.same')}</small><strong data-testid="year-last-same">{y.hasLast ? t('ui.year.crates', { n: formatQty(y.lastYear.samePeriod) }) : t('ui.unknown')}</strong></div>
        <div><small>{t('ui.year.last.total')}</small><strong data-testid="year-last-total">{y.hasLast ? t('ui.year.crates', { n: formatQty(y.lastYear.total) }) : t('ui.unknown')}</strong></div>
      </div>
      <div class="yearcmp-grid" role="img" aria-label={t('ui.year.chart.alt')} data-testid="year-chart">
        {y.rows.map((r) => (
          <div class="yearcmp-month" key={r.month}>
            <span class="yearcmp-bar last" style={{ height: bar(r.lastYear) }} />
            <span class="yearcmp-bar this" style={{ height: bar(r.thisYear) }} />
          </div>
        ))}
      </div>
      <small>{t('ui.year.legend')}</small>
      {y.thisYear.unreadable + y.lastYear.unreadable > 0 && <small data-testid="year-unreadable">{t('ui.year.unreadable', { k: formatQty(y.thisYear.unreadable + y.lastYear.unreadable) })}</small>}
    </section>
  );
}
