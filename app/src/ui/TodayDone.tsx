import { formatDateTime, t } from '../i18n';
import { parseWhole } from '@aloni/rules-core';
import type { Row } from '../db/schema';
import type { DoneRecord } from '../summary/today';
import { DetailSheet, ListRow, SheetFact } from './ds';
import { CropIcon } from './ds';
import { nameOf } from './screens';
import { openSheet } from './nav';
import { registerSheet, type SheetProps } from './sheets';
import { useRows } from './useRows';
import './ProductSheet';
import './CrateLabelSheet';

const where = (d: DoneRecord): string => (d.destination === 'store' ? t('ui.done.dest.store') : d.destination === 'dispatch' ? t('ui.done.dest.dispatch') : t('ui.done.dest.unknown'));
const cratesOf = (d: DoneRecord): string => (d.crates === undefined ? t('ui.done.crates.unknown') : t('ui.done.crates', { n: d.crates }));
const crop = (rows: readonly Row[] | null, id: string): Row | undefined => (rows ?? []).find((c) => c.id === id);

function DoneRow({ d, crops, parcels }: { d: DoneRecord; crops: readonly Row[] | null; parcels: readonly Row[] | null }) {
  const c = crop(crops, d.cropId); const p = crop(parcels, d.parcelId);
  const line = d.kind === 'spray' ? [t('ui.done.spray'), c ? nameOf(c) : '', d.product] : [t('ui.done.harvest'), c ? nameOf(c) : '', `${cratesOf(d)} → ${where(d)}`];
  const heading = line.filter((x) => x !== '').join(' · ');
  const icon = <CropIcon slug={String(c?.slug ?? '')} size="var(--icon-sm)" />;
  return <ListRow testid="today-done-row" icon={icon} heading={heading} meta={p ? nameOf(p) : undefined} onClick={() => openSheet('done', `${d.kind}:${d.id}`)} />;
}

/** One row per record made today: «Ψεκασμός · Αντίδια · Kocide 2000» or «Συγκομιδή · Αντίδια · 12 κλούβες → Αποθήκη». A tap opens the record's detail. */
export function TodayDone({ records }: { records: readonly DoneRecord[] }) {
  const crops = useRows('crops'); const parcels = useRows('parcels');
  return <>{records.map((d) => <DoneRow key={d.id} d={d} crops={crops.rows} parcels={parcels.rows} />)}</>;
}

function DoneSheet({ id, close }: SheetProps) {
  const sprays = useRows('job_spray'); const harvests = useRows('job_harvest'); const links = useRows('job_plantings'); const plantings = useRows('plantings');
  const crops = useRows('crops'); const parcels = useRows('parcels'); const products = useRows('products'); const workers = useRows('workers'); const jobs = useRows('jobs');
  const [kind, rid] = id.split(':');
  if (!sprays.rows || !harvests.rows) return null;
  const nameById = (rows: readonly Row[] | null, v: unknown): string => nameOf((rows ?? []).find((r) => r.id === v) ?? {});
  const row = (kind === 'spray' ? sprays.rows : harvests.rows).find((r) => r.id === rid);
  if (!row) return <DetailSheet heading={t('ui.sheet.notfound.head')} onClose={close} testid="sheet-notfound"><p class="ds-muted">{t('ui.sheet.notfound.body')}</p></DetailSheet>;
  const pid = kind === 'spray' ? (links.rows ?? []).find((l) => l.job_id === row.job_id)?.planting_id : row.planting_id;
  const planting = (plantings.rows ?? []).find((p) => p.id === pid);
  const job = (jobs.rows ?? []).find((j) => j.id === row.job_id);
  const worker = nameById(workers.rows, kind === 'spray' ? row.applicator_id : row.cut_by ?? job?.worker_id);
  const at = String(kind === 'spray' ? row.sprayed_at : row.harvested_at);
  const dest = row.destination === 'store' ? t('ui.done.dest.store') : row.destination === 'dispatch' ? t('ui.done.dest.dispatch') : undefined;
  const whole = parseWhole<'Crates'>(typeof row.crates_str === 'string' ? row.crates_str : '');
  const n = whole.known ? t('ui.done.crates', { n: String(whole.value) }) : undefined;
  return (
    <DetailSheet heading={kind === 'spray' ? t('ui.done.spray') : t('ui.done.harvest')} onClose={close} testid="done-sheet">
      <SheetFact name={t('ui.done.crop')} value={nameById(crops.rows, planting?.crop_id) || undefined} unknown={t('ui.unknown')} />
      <SheetFact name={t('ui.done.parcel')} value={nameById(parcels.rows, planting?.parcel_id) || undefined} unknown={t('ui.unknown')} />
      <SheetFact name={t('ui.done.when')} value={formatDateTime(at)} unknown={t('ui.unknown')} />
      <SheetFact name={t('ui.done.who')} value={worker || undefined} unknown={t('ui.done.worker.unknown')} />
      {kind === 'spray' && <SheetFact name={t('ui.done.product')} value={nameById(products.rows, row.product_id) || undefined} unknown={t('ui.unknown')} />}
      {kind === 'harvest' && <SheetFact name={t('ui.done.harvest')} value={n} unknown={t('ui.done.crates.unknown')} />}
      {kind === 'harvest' && <SheetFact name={t('ui.done.dest')} value={dest} unknown={t('ui.done.dest.unknown')} />}
      {kind === 'harvest' && <ListRow testid="crate-open" heading={t('ui.crate.open')} onClick={() => openSheet('crate', String(row.id))} />}
      {kind === 'spray' && typeof row.product_id === 'string' && <ListRow heading={t('ui.done.productpage')} onClick={() => openSheet('product', String(row.product_id))} />}
    </DetailSheet>
  );
}
registerSheet('done', DoneSheet);
