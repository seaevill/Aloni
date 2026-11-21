import { openSheet } from './nav';
import './JobDetailSheet';
import { formatDate, formatDateTime, t } from '../i18n';
import { athensToday } from '../plantings/planting';
import { jobHub } from '../summary/jobs';
import { DetailSheet } from './ds/DetailSheet';
import { ListRow } from './ds/Surfaces';
import { Icon } from './icons/Icon';
import { nameOf } from './screens';
import { registerSheet, type SheetProps } from './sheets';
import { useRows } from './useRows';
import type { Row } from '../db/schema';

// Σήμερα → «Εργασίες»: which jobs, for whom, when. The open jobs in their groups (late, today, tomorrow, later) and the ones done today with the time they were done. Every row says the product, the plantings (crop · field), the worker and the day;
// a missing worker or day is written as unknown with its reason. Read-only: nothing here changes a job.
const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const GROUPS = [['overdue', 'jobs.group.overdue'], ['today', 'jobs.group.today'], ['tomorrow', 'jobs.group.tomorrow'], ['later', 'jobs.group.later']] as const;

function JobsSheet({ close }: SheetProps) {
  const jobs = useRows('jobs'); const links = useRows('job_plantings'); const plantings = useRows('plantings'); const crops = useRows('crops'); const parcels = useRows('parcels'); const products = useRows('products'); const workers = useRows('workers');
  const hub = jobHub(jobs.rows ?? [], athensToday(new Date()) ?? '');
  const where = (j: Row): string => [...new Set((links.rows ?? []).filter((l) => l.job_id === j.id).map((l) => (plantings.rows ?? []).find((p) => p.id === l.planting_id)).filter((p): p is Row => !!p).map((p) => t('spray.planting', { crop: nameOf((crops.rows ?? []).find((c) => c.id === p.crop_id) ?? {}), parcel: text((parcels.rows ?? []).find((x) => x.id === p.parcel_id)?.name) })))].join(', ');
  const who = (j: Row): string => text((workers.rows ?? []).find((w) => w.id === j.worker_id)?.name) || t('ui.jobs.worker.none');
  const row = (j: Row, when: string) => <ListRow key={String(j.id)} heading={nameOf((products.rows ?? []).find((p) => p.id === j.product_id) ?? {}) || t('ui.unknown')} meta={`${where(j) || t('ui.jobs.where.none')} · ${who(j)}`} trailing={<strong>{when}</strong>} onClick={() => openSheet('job', String(j.id))} testid="job-row" />;
  const empty = GROUPS.every(([k]) => hub.open[k].length === 0) && hub.doneToday.length === 0;
  return (
    <DetailSheet heading={t('tasks.title')} icon={<Icon name="calendar" />} onClose={close} testid="sheet-jobs">
      {empty && <p class="ds-muted" data-testid="sheet-why">{t('ui.jobs.none')}</p>}
      {GROUPS.map(([k, label]) => hub.open[k].length > 0 && (
        <section key={k} data-testid={`sheet-jobs-${k}`}><h3>{t(label)}</h3>{hub.open[k].map((j) => row(j, text(j.planned_for) === '' ? t('ui.jobs.day.none') : formatDate(text(j.planned_for))))}</section>
      ))}
      {hub.doneToday.length > 0 && <section data-testid="sheet-jobs-done"><h3>{t('jobs.group.done')}</h3>{hub.doneToday.map((j) => row(j, formatDateTime(text(j.done_at))))}</section>}
    </DetailSheet>
  );
}
registerSheet('jobs', JobsSheet);
