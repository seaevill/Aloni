import { formatDate, formatDateTime, t } from '../i18n';
import { formatQty } from '../i18n/format';
import { athensToday } from '../plantings/planting';
import { jobDetail } from '../summary/jobs';
import { Chip } from './ds/Chip';
import { DetailSheet, SheetFact } from './ds/DetailSheet';
import { ListRow } from './ds/Surfaces';
import { Icon } from './icons/Icon';
import { nameOf } from './screens';
import { registerSheet, type SheetProps } from './sheets';
import { useRows } from './useRows';

// Εργασίες → a job opens here: the day (and «late»), the crop · field it covers, the product, who it was given to, the spray record made for it and the harvests logged on the same plantings since the planned day.
// Read-only. Unknown is written with its reason (a missing day, worker or record is never blank and never 0).
function JobDetailSheet({ id, close }: SheetProps) {
  const jobs = useRows('jobs'); const links = useRows('job_plantings'); const plantings = useRows('plantings'); const crops = useRows('crops'); const parcels = useRows('parcels');
  const products = useRows('products'); const workers = useRows('workers'); const sprays = useRows('job_spray'); const harvests = useRows('job_harvest');
  if (!jobs.rows) return null;
  const d = jobDetail(id, { jobs: jobs.rows, links: links.rows ?? [], plantings: plantings.rows ?? [], sprays: sprays.rows ?? [], harvests: harvests.rows ?? [] }, athensToday(new Date()) ?? '');
  if (!d) return <DetailSheet heading={t('ui.sheet.notfound.head')} onClose={close} testid="sheet-notfound"><p class="ds-muted">{t('ui.sheet.notfound.body')}</p></DetailSheet>;
  const crop = (cid: string) => nameOf((crops.rows ?? []).find((c) => c.id === cid) ?? {});
  const parcel = (pid: string) => nameOf((parcels.rows ?? []).find((p) => p.id === pid) ?? {});
  const product = nameOf((products.rows ?? []).find((p) => p.id === d.productId) ?? {});
  const worker = nameOf((workers.rows ?? []).find((w) => w.id === d.workerId) ?? {});
  return (
    <DetailSheet heading={product || t('ui.unknown')} icon={<Icon name="calendar" />} onClose={close} testid="sheet-job">
      {d.late && <Chip tone="blocked">{t('jobs.group.overdue')}</Chip>}
      <SheetFact name={t('ui.job.day')} value={d.plannedFor === undefined ? undefined : formatDate(d.plannedFor)} unknown={t('ui.jobs.day.none')} />
      <SheetFact name={t('ui.job.worker')} value={worker || undefined} unknown={t('ui.jobs.worker.none')} />
      <h3>{t('ui.job.plantings')}</h3>
      {d.plantings.length === 0 && <p class="ds-muted" data-testid="job-plantings-none">{t('ui.jobs.where.none')}</p>}
      {d.plantings.map((p) => <ListRow key={p.id} heading={crop(p.cropId) || t('ui.unknown')} meta={parcel(p.parcelId) || t('ui.unknown')} />)}
      <h3>{t('ui.job.spray')}</h3>
      {d.spray ? <ListRow heading={formatDateTime(d.spray.at)} meta={t('ui.job.spray.made')} testid="job-spray" /> : <p class="ds-muted" data-testid="job-spray-none">{t('ui.job.spray.none')}</p>}
      <h3>{t('ui.job.harvests')}</h3>
      {d.harvests.length === 0 && <p class="ds-muted" data-testid="job-harvests-none">{t('ui.job.harvests.none')}</p>}
      {d.harvests.map((h) => <ListRow key={h.id} heading={formatDateTime(h.at)} meta={h.crates === undefined ? t('ui.job.crates.unknown') : t('ui.job.crates', { n: formatQty(h.crates) })} testid="job-harvest" />)}
    </DetailSheet>
  );
}
registerSheet('job', JobDetailSheet);
