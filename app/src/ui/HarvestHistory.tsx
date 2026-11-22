import { parseWhole } from '@aloni/rules-core';
import { activeFarm } from '../db';
import { DEMO_FARM_ID } from '../config';
import { formatDateTime, t, tn } from '../i18n';
import { Card, ListRow, SectionHead } from './ds';
import { nameOf } from './screens';
import { useRows } from './useRows';
import type { HarvestEvent, HarvestSource } from './HarvestBreakdown';

const text = (value: unknown) => typeof value === 'string' ? value : '';

export function HarvestHistory({ onOpen, owner }: { onOpen: (source: HarvestSource) => void; owner: boolean }) {
  const harvests = useRows('job_harvest');
  const plantings = useRows('plantings');
  const crops = useRows('crops');
  const parcels = useRows('parcels');
  const workers = useRows('workers');
  const rows = (harvests.rows ?? []).filter((r) => r.farm_id === activeFarm.value && !r.deleted_at).sort((a, b) => text(b.harvested_at).localeCompare(text(a.harvested_at)));
  const plantingById = new Map((plantings.rows ?? []).map((p) => [text(p.id), p]));
  const eventOf = (row: (typeof rows)[number]): HarvestEvent => {
    const planting = plantingById.get(text(row.planting_id));
    const crates = parseWhole<'Crates'>(text(row.crates_str));
    const destination = row.destination === 'store' ? 'store'
      : row.destination === 'direct' || (row.farm_id === DEMO_FARM_ID && row.destination === 'dispatch') ? 'direct' : 'unknown';
    return {
      id: text(row.id),
      at: text(row.harvested_at),
      plantingId: text(planting?.id),
      parcel: text(parcels.rows?.find((p) => p.id === planting?.parcel_id)?.name) || t('value.unknown'),
      worker: owner ? text(workers.rows?.find((w) => w.id === row.cut_by)?.name) || t('value.unknown') : undefined,
      count: crates.known ? tn('harvest.count', crates.value) : t('value.unknown'),
      destination,
      crates: crates.known && crates.value > 0 ? crates.value : undefined,
    };
  };
  return <>
    <SectionHead heading={t('harvest.title')} />
    {harvests.rows && rows.length === 0 && <p class="muted">{t('harvest.empty')}</p>}
    {rows.map((row) => {
      const cropId = plantingById.get(text(row.planting_id))?.crop_id;
      const crop = nameOf(crops.rows?.find((c) => c.id === cropId) ?? {}) || t('value.unknown');
      const event = eventOf(row);
      const open = () => onOpen({
        crop, ...event,
        history: typeof cropId !== 'string' || cropId === '' ? [event]
          : rows.filter((r) => plantingById.get(text(r.planting_id))?.crop_id === cropId).map(eventOf),
      });
      return <Card key={row.id} testid="harvest">
        <ListRow heading={t('spray.planting', { crop, parcel: event.parcel })} meta={event.count} onClick={open} testid="harvest-breakdown-open" />
        <small>{event.at ? formatDateTime(event.at) : t('value.unknown')}</small>
        {event.worker !== undefined && <small data-testid="harvest-who">{t('harvest.cutby.line', { name: event.worker })}</small>}
      </Card>;
    })}
  </>;
}
