import { signal } from '@preact/signals';
import { useEffect, useState } from 'preact/hooks';
import { activeFarm, db } from '../db';
import { putLocal } from '../repo';
import { formatDateTime, t } from '../i18n';
import { notices, type NoticeWho } from '../summary/notices';
import { DetailSheet } from './ds/DetailSheet';
import { ListRow } from './ds/Surfaces';
import { Icon } from './icons/Icon';
import { nameOf } from './screens';
import { openSheet } from './nav';
import { registerSheet, type SheetProps } from './sheets';
import { useRows } from './useRows';

// The bell (E2): «what is new since I last looked», from the job rows already on the phone: the owner sees finished jobs, a worker sees new jobs assigned to her.
// «Last look» is a device-local time (never sent anywhere). The first time there is none, the bell starts from now, so old jobs are not called new. No push here: this is the in-app list only.
const keyOf = (who: string): string => `bell_seen_at:${activeFarm.value}:${who}`;
const whoOf = (id: string): NoticeWho => (id === 'owner' ? { role: 'owner', seenAt: undefined } : { role: 'worker', workerId: id.replace(/^worker-/, ''), seenAt: undefined });

const seenAt = signal<Record<string, string>>({});      // one shared «last look» per bell: the button and its list read and write the same value

function useSeen(id: string): [string | undefined, (at: string) => void] {
  const key = keyOf(id);
  useEffect(() => {
    if (seenAt.value[key] !== undefined) return;
    void db.settings.get(key).then(async (r) => {
      const at = typeof r?.value === 'string' ? r.value : new Date().toISOString();
      if (r === undefined) await putLocal(db, key, at);
      if (seenAt.value[key] === undefined) seenAt.value = { ...seenAt.value, [key]: at };
    });
  }, [key]);
  return [seenAt.value[key], (at) => { seenAt.value = { ...seenAt.value, [key]: at }; void putLocal(db, key, at); }];
}

export function Bell({ id }: { id: string }) {
  const jobs = useRows('jobs');
  const [seen] = useSeen(id);
  const n = notices(jobs.rows ?? [], { ...whoOf(id), seenAt: seen }).length;
  return (
    <button type="button" class="bell-btn" data-testid="bell" aria-label={n > 0 ? t('ui.bell.label.count', { n }) : t('ui.bell.label')} onClick={() => openSheet('notices', id)}>
      <Icon name="bell" />
      {n > 0 && <span class="bell-count" data-testid="bell-count" aria-hidden="true">{n}</span>}
    </button>
  );
}

function NoticesSheet({ id, close }: SheetProps) {
  const jobs = useRows('jobs'); const products = useRows('products');
  const [seen, setSeen] = useSeen(id);
  const list = notices(jobs.rows ?? [], { ...whoOf(id), seenAt: seen });
  const [shown, setShown] = useState<typeof list | undefined>(undefined);
  useEffect(() => { if (seen !== undefined && shown === undefined && jobs.rows) setShown(list); }, [seen, jobs.rows]);   // the list stays as it was when the sheet opened; the next look starts from the time it was closed
  const items = shown ?? list;
  const done = () => { setSeen(new Date().toISOString()); close(); };
  return (
    <DetailSheet heading={t('ui.bell.title')} icon={<Icon name="bell" />} onClose={done} testid="sheet-notices">
      {items.length === 0 && <p class="ds-muted" data-testid="sheet-why">{t('ui.bell.none')}</p>}
      {items.map((x) => {
        const job = (jobs.rows ?? []).find((j) => String(j.id) === x.jobId);
        return <ListRow key={x.jobId + x.kind} testid="notice" heading={t(x.kind === 'done' ? 'ui.bell.done' : 'ui.bell.new')} meta={nameOf((products.rows ?? []).find((p) => p.id === job?.product_id) ?? {}) || t('ui.unknown')} trailing={<strong>{formatDateTime(x.at)}</strong>} />;
      })}
    </DetailSheet>
  );
}
registerSheet('notices', NoticesSheet);
