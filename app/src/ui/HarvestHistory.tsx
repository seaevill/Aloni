import { parseWhole } from '@aloni/rules-core';
import { formatDateTime, t, tn } from '../i18n';
import { Card, ListRow, SectionHead } from './ds';
import { nameOf } from './screens';
import { useRows } from './useRows';
import type { HarvestSource } from './HarvestBreakdown';

const text = (value: unknown) => typeof value === 'string' ? value : '';

export function HarvestHistory({ onOpen, owner }: { onOpen: (source: HarvestSource) => void; owner: boolean }) {
  const harvests = useRows('job_harvest');
  const plantings = useRows('plantings');
  const crops = useRows('crops');
  const parcels = useRows('parcels');
  const workers = useRows('workers');
  const rows = (harvests.rows ?? []).filter((r) => !r.deleted_at).sort((a, b) => text(b.harvested_at).localeCompare(text(a.harvested_at)));
  return <>
    <SectionHead heading={t('harvest.title')} />
    {harvests.rows && rows.length === 0 && <p class="muted">{t('harvest.empty')}</p>}
    {rows.map((row) => {
      const planting = plantings.rows?.find((p) => p.id === row.planting_id);
      const parcel = text(parcels.rows?.find((p) => p.id === planting?.parcel_id)?.name) || t('value.unknown');
      const crop = nameOf(crops.rows?.find((c) => c.id === planting?.crop_id) ?? {}) || t('value.unknown');
      const worker = owner ? text(workers.rows?.find((w) => w.id === row.cut_by)?.name) || t('value.unknown') : undefined;
      const crates = parseWhole<'Crates'>(text(row.crates_str));
      const count = crates.known ? tn('harvest.count', crates.value) : t('value.unknown');
      const source: HarvestSource = { crop, parcel, worker, at: text(row.harvested_at), count };
      return <Card key={row.id} testid="harvest">
        <ListRow heading={t('spray.planting', { crop, parcel })} meta={count} onClick={() => onOpen(source)} testid="harvest-breakdown-open" />
        <small>{formatDateTime(source.at)}</small>
        {worker !== undefined && <small data-testid="harvest-who">{t('harvest.cutby.line', { name: worker })}</small>}
      </Card>;
    })}
  </>;
}
