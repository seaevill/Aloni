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
import { rangesFor } from '../content/crop-ranges';
import { useRows } from './useRows';
import { nameOf } from './screens';
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
  const plantings = useRows('plantings'); const crops = useRows('crops');
  const cropsHere = [...new Map((plantings.rows ?? []).filter((p) => p.parcel_id === row.parcel_id && !p.deleted_at).map((p) => (crops.rows ?? []).find((c) => c.id === p.crop_id)).filter((c): c is Row => c !== undefined).map((c) => [c.id, c])).values()];
  return <section data-testid="analysis-explain">
    <PageHead heading={field === 'ph' ? t('analysis.name.ph') : t('analysis.name.ec')} back={onBack} backText={t('info.back')} />
    <Card>
      {display !== undefined && <strong data-testid="analysis-reading">{display}</strong>}
      <p>{copy[field].what}</p>
      <p>{copy[field].meaning}</p>
      <p data-testid="analysis-leafy-effect">{copy[field].effect}</p>
      {range ? <figure class="analysis-scale" data-testid="analysis-recorded-range">
        <figcaption>{copy.range}</figcaption>
        <svg viewBox="0 0 100 8" aria-hidden="true">
          <line x1="3" y1="4" x2="97" y2="4" />
          <circle cx={3 + (range.value - range.low) / (range.high - range.low) * 94} cy="4" r="3" />
        </svg>
        <div><span>{formatQty(range.low)}</span><span>{formatQty(range.high)}</span></div>
      </figure> : <small>{copy.noRange}</small>}
      <p>{copy.approvalNote}</p>
    </Card>
    {cropsHere.length > 0 && <Card testid="analysis-crop-ranges">
      <h3>{t('ui.range.title')}</h3>
      {cropsHere.map((c) => <CropRanges key={String(c.id)} crop={c} field={field} />)}
      <small>{t('ui.range.note')}</small>
    </Card>}
  </section>;
}

function CropRanges({ crop, field }: { crop: Row; field: Measurement }) {
  const found = rangesFor(String(crop.slug), field);
  if (found.length === 0) return <p class="ds-muted" data-testid="analysis-crop-range">{t('ui.range.none', { crop: nameOf(crop) })}</p>;
  return <>{found.map((r) => <p key={r.url} data-testid="analysis-crop-range">{t('ui.range.line', { crop: nameOf(crop), low: r.low, high: r.high })}<br /><a href={r.url} target="_blank" rel="noopener noreferrer">{r.source}</a></p>)}{found.length > 1 && <small>{t('ui.range.differ')}</small>}</>;
}
