import { formatDate, formatDateTime, t, type I18nKey } from '../i18n';
import { formatArea } from '../i18n/format';
import { validDate } from '../plantings/planting';
import { effectiveSprays } from '../spray/spray';
import type { Row } from '../db/schema';
import { BackBar } from './BackBar';
import { STATUS_KEYS } from './PlantingForm';
import { waitLine } from './Sprays';
import { nameOf } from './screens';
import { useRows } from './useRows';

const text = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');

/** Tapped from the crops list (prototype «Crop detail»): the crop, its plantings per parcel, and the LAST spraying on it with the waiting period read from the record. Information only. */
export function CropDetail({ crop, onBack }: { crop: Row; onBack: () => void }) {
  const plantings = useRows('plantings'); const parcels = useRows('parcels'); const links = useRows('job_plantings'); const sprays = useRows('job_spray'); const products = useRows('products');
  const mine = (plantings.rows ?? []).filter((p) => p.crop_id === crop.id && !p.deleted_at);
  const jobIds = new Set((links.rows ?? []).filter((l) => mine.some((p) => p.id === l.planting_id)).map((l) => l.job_id));
  const last = effectiveSprays((sprays.rows ?? []).filter((s) => jobIds.has(s.job_id))).sort((a, b) => text(b.sprayed_at).localeCompare(text(a.sprayed_at)))[0];
  const line = (p: Row): string => { const d = text(p.sown_on); const sk = (STATUS_KEYS as Record<string, I18nKey>)[text(p.status)]; return [formatArea(p.area_str as string | number), validDate(d) ? formatDate(d) : '', sk ? t(sk) : ''].filter((x) => x !== '').join(' · '); };
  const parcelName = (p: Row): string => text(parcels.rows?.find((x) => x.id === p.parcel_id)?.name);
  return (
    <section class="detail" data-testid="crop-detail">
      <header class="band">
        <BackBar onBack={onBack} testId="detail-back" />
        <h1 tabIndex={-1}>{nameOf(crop)}</h1>
        {typeof crop.latin === 'string' && crop.latin !== '' && <p class="latin">{crop.latin}</p>}
      </header>
      <h2>{t('detail.plantings')}</h2>
      {mine.length === 0 && <p class="muted">{t('list.empty')}</p>}
      {mine.map((p) => <div class="card" key={p.id} data-testid="detail-planting">{parcelName(p)}<small>{line(p)}</small></div>)}
      <h2>{t('detail.lastspray')}</h2>
      {!last && <p class="muted" data-testid="detail-nospray">{t('spray.empty')}</p>}
      {last && (
        <div class="card" data-testid="detail-lastspray">{nameOf(products.rows?.find((p) => p.id === last.product_id) ?? {})}
          <small>{formatDateTime(text(last.sprayed_at))}</small>
          {waitLine(last, 'phi_days') ? <small>{waitLine(last, 'phi_days')}</small> : <small>{t('spray.phi.unknown')}</small>}
          {waitLine(last, 'rei_hours') && <small>{waitLine(last, 'rei_hours')}</small>}
        </div>
      )}
    </section>
  );
}
