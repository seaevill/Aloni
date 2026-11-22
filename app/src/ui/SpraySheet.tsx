import { parsePhiDays, parseReiHours, phiEnd, reiEnd } from '@aloni/rules-core';
import type { Row } from '../db/schema';
import { formatDateTime, t } from '../i18n';
import { NOT_ON_LABEL } from '../labels/label-use';
import { instantOf } from '../spray/time';
import { waitRing } from '../summary/wait';
import { DetailSheet, ListRow, SheetFact } from './ds';
import { UNIT_KEYS } from './LabelUseForm';
import { WaitRing } from './ds/WaitRing';
import { openSheet } from './nav';
import { nameOf } from './screens';
import { registerSheet, type SheetProps } from './sheets';
import { useRows } from './useRows';
import './ProductSheet';

const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const unitName = (u: string): string => (Object.hasOwn(UNIT_KEYS, u) ? t(UNIT_KEYS[u as keyof typeof UNIT_KEYS]) : u);

// The process of ONE recorded spraying: product, when, the dose exactly as recorded (never rounded, never advised), the wait ring while the waiting period runs, «Κοπή από», the re-entry end and who sprayed.
// The periods come only from the record (copied from the label); a missing one is «άγνωστο» with its reason, never a default.
function SpraySheet({ id, close }: SheetProps) {
  const sprays = useRows('job_spray'); const products = useRows('products'); const workers = useRows('workers'); const links = useRows('job_plantings'); const plantings = useRows('plantings'); const crops = useRows('crops'); const parcels = useRows('parcels');
  if (!sprays.rows) return null;
  const row = sprays.rows.find((r) => r.id === id);
  if (!row) return <DetailSheet heading={t('ui.sheet.notfound.head')} onClose={close} testid="sheet-notfound"><p class="ds-muted">{t('ui.sheet.notfound.body')}</p></DetailSheet>;
  const at = text(row.sprayed_at);
  const phi = text(row.phi_days); const rei = text(row.rei_hours);
  const cutEnd = phi === '' || phi === NOT_ON_LABEL ? undefined : phiEnd(at, parsePhiDays(phi));
  const reEnd = rei === '' || rei === NOT_ON_LABEL ? undefined : reiEnd(at, parseReiHours(rei));
  const now = instantOf(new Date()) ?? '';
  const ring = cutEnd?.known ? waitRing(at, cutEnd.value, now) : undefined;
  const over = cutEnd?.known === true && ring === undefined;
  const product = (products.rows ?? []).find((p) => p.id === row.product_id);
  const worker = (workers.rows ?? []).find((w) => w.id === row.applicator_id);
  const where = [...new Set((links.rows ?? []).filter((l) => l.job_id === row.job_id).map((l) => (plantings.rows ?? []).find((p) => p.id === l.planting_id)).filter((p): p is Row => p !== undefined)
    .map((p) => [nameOf((crops.rows ?? []).find((c) => c.id === p.crop_id) ?? {}), nameOf((parcels.rows ?? []).find((x) => x.id === p.parcel_id) ?? {})].join(' · ')))].join(', ');
  const dose = text(row.dose_str) === '' ? undefined : [text(row.dose_str).split('.').join(','), unitName(text(row.dose_unit))].filter((x) => x !== '').join(' ');
  return (
    <DetailSheet heading={product ? nameOf(product) : t('ui.unknown')} onClose={close} testid="spray-sheet">
      {ring && <div class="ds-ring-block"><WaitRing big daysLeft={ring.daysLeft} percent={ring.percent} /></div>}
      {over && <p class="ds-muted" data-testid="spray-sheet-over">{t('ui.spray.over')}</p>}
      <SheetFact name={t('ui.spray.when')} value={at === '' ? undefined : formatDateTime(at)} unknown={t('ui.unknown')} />
      <span data-testid="spray-sheet-dose"><SheetFact name={t('ui.spray.dose')} value={dose} unknown={t('ui.spray.dose.none')} /></span>
      <span data-testid="spray-sheet-cutfrom"><SheetFact name={t('ui.spray.cutfrom')} value={cutEnd?.known ? formatDateTime(cutEnd.value) : undefined} unknown={t('ui.spray.cutfrom.unknown')} /></span>
      <span data-testid="spray-sheet-reentry"><SheetFact name={t('ui.spray.reentry')} value={reEnd?.known ? formatDateTime(reEnd.value) : undefined} unknown={t('ui.spray.reentry.unknown')} /></span>
      <SheetFact name={t('ui.spray.where')} value={where === '' ? undefined : where} unknown={t('ui.unknown')} />
      <SheetFact name={t('ui.spray.who')} value={worker ? nameOf(worker) : undefined} unknown={t('ui.spray.who.unknown')} />
      {typeof row.product_id === 'string' && <div data-testid="spray-sheet-product"><ListRow heading={t('ui.product.open')} onClick={() => openSheet('product', String(row.product_id))} /></div>}
    </DetailSheet>
  );
}
registerSheet('spray', SpraySheet);
