import { formatDate, t } from '../i18n';
import { harvestGate } from '../spray/harvest';
import { instantOf } from '../spray/time';
import { plantingWait, runningSince, waitRing } from '../summary/wait';
import { Chip } from './ds/Chip';
import { DetailSheet, SheetFact } from './ds/DetailSheet';
import { WaitRing } from './ds/WaitRing';
import { ListRow } from './ds/Surfaces';
import { CropIcon } from './illustrations/crops/CropIcon';
import { Icon } from './icons/Icon';
import { nameOf } from './screens';
import { openSheet } from './nav';
import { registerSheet, type SheetProps } from './sheets';
import { useRows } from './useRows';
import type { Row } from '../db/schema';

// «Αναμονή»: the sheet behind a cut card. A running wait gets the ring (days left, percent elapsed); an unknown wait says WHY and shows no ring; a finished wait says so. All from the recorded spraying and the SIGNED label of the
// planting's own crop, by the same gate as the harvest check. Nothing here shortens a waiting period or gives a dose.
const day = (iso: string | undefined): string => (iso === undefined || iso === '' ? '' : formatDate(iso.slice(0, 10)));

function WaitSheet({ id, close }: SheetProps) {
  const plantings = useRows('plantings'); const parcels = useRows('parcels'); const crops = useRows('crops'); const links = useRows('job_plantings'); const sprays = useRows('job_spray'); const labels = useRows('label_uses');
  if (!plantings.rows || !crops.rows) return null;
  const planting = plantings.rows.find((p) => p.id === id);
  if (!planting) return <DetailSheet heading={t('ui.sheet.notfound.head')} onClose={close} testid="sheet-notfound"><p class="ds-muted">{t('ui.sheet.notfound.body')}</p></DetailSheet>;
  const crop = crops.rows.find((c) => c.id === planting.crop_id) as Row | undefined;
  const parcel = (parcels.rows ?? []).find((p) => p.id === planting.parcel_id);
  const now = instantOf(new Date()) ?? '';
  const w = plantingWait(id, now, links.rows ?? [], sprays.rows ?? [], plantings.rows, labels.rows ?? []);
  const gate = harvestGate(id, now, links.rows ?? [], sprays.rows ?? [], plantings.rows, labels.rows ?? []);
  const since = w.state === 'running' ? runningSince(id, now, links.rows ?? [], sprays.rows ?? [], plantings.rows, labels.rows ?? []) : undefined;
  const ring = w.state === 'running' && since !== undefined && w.until !== undefined ? waitRing(since, w.until, now) : undefined;
  const source = !gate.ok && gate.source === 'manual' ? t('ui.wait.source.manual') : t('ui.wait.source.label');
  const heading = crop ? nameOf(crop) : t('ui.unknown');
  return (
    <DetailSheet heading={heading} icon={crop ? <CropIcon slug={String(crop.slug)} size="calc(var(--tile) - var(--sp-16))" /> : <Icon name="hourglass" />} onClose={close} testid="sheet-wait">
      <p class="ds-muted">{parcel ? nameOf(parcel) : t('ui.unknown')}</p>
      {ring && <div class="ds-ring-block"><WaitRing big daysLeft={ring.daysLeft} percent={ring.percent} /></div>}
      {w.state === 'running' && w.until !== undefined && <Chip tone="warn">{t('ui.wait.until', { d: day(w.until) })}</Chip>}
      {w.state === 'unknown' && <><Chip tone="unknown">{t('ui.wait.unknown.chip')}</Chip><p class="ds-muted" data-testid="sheet-why">{t('ui.wait.unknown.why')}</p></>}
      {w.state === 'free' && w.lastSprayAt !== undefined && <Chip tone="ready">{t('ui.wait.over')}</Chip>}
      {w.state === 'running' && !ring && <p class="ds-muted" data-testid="sheet-why">{t('ui.wait.noring')}</p>}
      <SheetFact name={t('ui.wait.sprayed')} value={day(since ?? w.lastSprayAt)} unknown={t('ui.wait.sprayed.none')} />
      <SheetFact name={t('ui.wait.ends')} value={w.state === 'running' ? day(w.until) : undefined} unknown={w.state === 'unknown' ? t('ui.wait.ends.unknown') : t('ui.wait.ends.none')} />
      {w.state === 'running' && <SheetFact name={t('ui.wait.source')} value={source} />}
      <p class="ds-muted">{t('ui.wait.note')}</p>
      {crop && <ListRow heading={t('ui.wait.open.crop')} onClick={() => openSheet('crop', String(crop.id))} />}
    </DetailSheet>
  );
}
registerSheet('wait', WaitSheet);
