import { rangesFor, type CropRange } from '../content/crop-ranges';
import { t } from '../i18n';
import { formatQty } from '../i18n/format';
import type { Row } from '../db/schema';
import { DetailSheet } from './ds';
import { nameOf } from './screens';

// Φυτά › «Οδηγός καλλιέργειας»: the general literature ranges of a crop, each with the link to the page it was read on. Read-only, NOT signed by an agronomist, never used to decide anything.
// A measurement without a checked source says «δεν υπάρχει πηγή» — nothing is filled in from memory.
const ROWS = [['sow_to_cut', 'ui.guide.sow'], ['cuts', 'ui.guide.cuts'], ['ph', 'ui.guide.ph']] as const;

function Line({ r }: { r: CropRange }) {
  const text = r.measure === 'ph' ? t('ui.guide.v.ph', { low: formatQty(r.low), high: formatQty(r.high) }) : r.measure === 'sow_to_cut' ? t('ui.guide.v.days', { low: formatQty(r.low), high: formatQty(r.high) }) : t('ui.guide.v.cuts', { low: formatQty(r.low), high: formatQty(r.high) });
  return <p data-testid="guide-range"><strong>{text}</strong><br /><a href={r.url} target="_blank" rel="noopener noreferrer">{r.source} ↗</a></p>;
}

export function CropGuide({ crop, onClose }: { crop: Row; onClose: () => void }) {
  const slug = String(crop.slug);
  return (
    <DetailSheet heading={`${t('ui.guide.title')} · ${nameOf(crop)}`} onClose={onClose} history={false} testid="crop-guide">
      <p class="chip-note" data-testid="guide-banner">{t('ui.guide.banner')}</p>
      {ROWS.map(([measure, label]) => {
        const found = rangesFor(slug, measure);
        return <section key={measure} data-testid={`guide-${measure}`}><h3>{t(label)}</h3>{found.length === 0 ? <p class="ds-muted" data-testid="guide-none">{t('ui.guide.none')}</p> : found.map((r) => <Line key={r.url} r={r} />)}</section>;
      })}
    </DetailSheet>
  );
}
