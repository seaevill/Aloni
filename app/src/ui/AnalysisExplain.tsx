import { lang, t } from '../i18n';
import { formatQty } from '../i18n/format';
import { EC_UNIT_KEYS } from './AnalysisForm';
import { EC_UNITS } from '../analyses/analysis';
import type { Row } from '../db/schema';
import { Card, PageHead } from './ds';
import el from '../content/analyses/el.json';
import tr from '../content/analyses/tr.json';
import en from '../content/analyses/en.json';
import hi from '../content/analyses/hi.json';
import './analyses-v2.css';

export const analysisCopy = () => ({ el, tr, en, hi })[lang.value] ?? el;
export type Measurement = 'ph' | 'ec';

function reading(value: unknown): number | undefined {
  if (typeof value !== 'string' || !/^\d+(?:\.\d+)?$/.test(value)) return;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : undefined;
}

export function recordedRange(field: Measurement, row: Row, records: readonly Row[]) {
  const value = reading(row[field]);
  if (value === undefined || (field === 'ec' && !EC_UNITS.some((unit) => unit === row.ec_unit))) return;
  const points = records.flatMap((r) => {
    if (field === 'ec' && r.ec_unit !== row.ec_unit) return [];
    const n = reading(r[field]);
    return n === undefined ? [] : [n];
  });
  const low = Math.min(value, ...points);
  const high = Math.max(value, ...points);
  return high > low ? { low, high, value } : undefined;
}

// TODO(ds): DetailSheet
export function AnalysisExplain({ field, row, records, onBack }: { field: Measurement; row: Row; records: readonly Row[]; onBack: () => void }) {
  const copy = analysisCopy();
  const ecUnit = EC_UNITS.find((unit) => unit === row.ec_unit);
  const raw = row[field];
  const value = typeof raw === 'string' && reading(raw) !== undefined ? formatQty(raw) : undefined;
  const display = value !== undefined && field === 'ec' && ecUnit ? [value, t(EC_UNIT_KEYS[ecUnit])].join(' ') : value;
  const range = recordedRange(field, row, records);
  return <section data-testid="analysis-explain">
    <PageHead heading={field === 'ph' ? t('analysis.name.ph') : t('analysis.name.ec')} back={onBack} backText={t('info.back')} />
    <Card>
      {display !== undefined && <strong data-testid="analysis-reading">{display}</strong>}
      <p>{copy[field].what}</p>
      <p>{copy[field].meaning}</p>
      {range ? <figure class="analysis-scale" data-testid="analysis-recorded-range">
        <figcaption>{copy.range}</figcaption>
        <svg viewBox="0 0 100 8" aria-hidden="true">
          <line x1="3" y1="4" x2="97" y2="4" />
          <circle cx={3 + (range.value - range.low) / (range.high - range.low) * 94} cy="4" r="3" />
        </svg>
        <div><span>{formatQty(range.low)}</span><span>{formatQty(range.high)}</span></div>
      </figure> : <small>{copy.noRange}</small>}
      <p>{t('notify.rules.unsigned')}</p>
    </Card>
  </section>;
}
