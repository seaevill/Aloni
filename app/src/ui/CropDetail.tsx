import { useState } from 'preact/hooks';
import { dateAfterDays } from '@aloni/rules-core';
import { formatDate, formatDateTime, t, type I18nKey } from '../i18n';
import { formatArea, formatQty } from '../i18n/format';
import { athensToday, validDate } from '../plantings/planting';
import { effectiveSprays } from '../spray/spray';
import type { Row } from '../db/schema';
import { BackBar } from './BackBar';
import { CropIcon, DetailSheet, ListRow } from './ds';
import { TapNum } from './cx/TapNum';
import { Icon } from './icons/Icon';
import { CropTips } from './CropTips';
import { ParcelSketch } from './ParcelSketch';
import { plantingMarks } from '../plantings/marks';
import { STATUS_KEYS } from './PlantingForm';
import { waitLine } from './Sprays';
import { nameOf } from './screens';
import { useRows } from './useRows';
import { useWeather } from './useWeather';
import { dayOf, parseDays } from '../weather/strip';

const text = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
const DASH = '—';

/** Tapped from the crops list (prototype «Crop detail»): the crop, its plantings per parcel, and the LAST spraying on it with the waiting period read from the record. Information only. */
export function CropDetail({ crop, onBack }: { crop: Row; onBack: () => void }) {
  const plantings = useRows('plantings'); const parcels = useRows('parcels'); const links = useRows('job_plantings'); const sprays = useRows('job_spray'); const products = useRows('products');
  const weather = useWeather();
  const [showPlantingSource, setShowPlantingSource] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const today = athensToday(new Date());
  const mine = (plantings.rows ?? []).filter((p) => p.crop_id === crop.id && !p.deleted_at);
  const jobIds = new Set((links.rows ?? []).filter((l) => mine.some((p) => p.id === l.planting_id)).map((l) => l.job_id));
  const last = effectiveSprays((sprays.rows ?? []).filter((s) => jobIds.has(s.job_id))).sort((a, b) => text(b.sprayed_at).localeCompare(text(a.sprayed_at)))[0];
  const line = (p: Row): string => { const d = text(p.sown_on); const sk = (STATUS_KEYS as Record<string, I18nKey>)[text(p.status)]; return [formatArea(p.area_str as string | number), validDate(d) ? formatDate(d) : '', sk ? t(sk) : ''].filter((x) => x !== '').join(' · '); };
  const sketchOf = (p: Row) => {
    const parcel = parcels.rows?.find((x) => x.id === p.parcel_id);
    if (!parcel) return null;
    const onParcel = (plantings.rows ?? []).filter((x) => x.parcel_id === p.parcel_id && !x.deleted_at);
    const marks = plantingMarks(text(parcel.area_str), onParcel.map((x) => ({ id: text(x.id), area: text(x.area_str) })));
    return <><ParcelSketch boundary={parcel.boundary} sample={parcel.sketch} marks={marks} highlight={text(p.id)} clipKey={`cd-${text(p.id)}`} /><small class="sketch-note">{marks.length > 0 ? t('ui.sketch.note') : t('ui.sketch.unknown')}</small></>;
  };
  const parcelName = (p: Row): string => text(parcels.rows?.find((x) => x.id === p.parcel_id)?.name);
  return (
    <section class="detail" data-testid="crop-detail">
      <BackBar onBack={onBack} testId="detail-back" />
      <header class="crop-detail-hero">
        <div class="crop-detail-art"><CropIcon slug={text(crop.slug)} size="var(--thumb)" /></div>
        <h1 class="ds-title" tabIndex={-1}>{nameOf(crop)}</h1>
        {typeof crop.latin === 'string' && crop.latin !== '' && <p class="latin" lang="la">{crop.latin}</p>}
      </header>
      <button type="button" class="btn secondary crop-tips-open" data-testid="crop-tips-open" onClick={() => setShowTips(true)}><Icon name="bulb" /><span>{t('ui.crop.tips')}</span></button>
      {showTips && <CropTips slug={text(crop.slug)} onClose={() => setShowTips(false)} />}
      {mine.length > 0 && <div class="crop-detail-source">
        <TapNum caption={t('detail.plantings')} source={{ value: formatQty(mine.length), count: mine.length }} onOpen={() => setShowPlantingSource(true)} />
      </div>}
      {showPlantingSource && <DetailSheet heading={t('detail.plantings')} onClose={() => setShowPlantingSource(false)} history={false} testid="crop-planting-source">
        {mine.map((p) => <ListRow key={p.id} heading={parcelName(p) || t('value.unknown')} meta={line(p)} />)}
      </DetailSheet>}
      <h2>{t('detail.plantings')}</h2>
      {mine.length === 0 && <p class="muted">{t('list.empty')}</p>}
      {mine.map((p, i) => {
        const days = parseDays(weather.find((record) => record.parcel_id === p.parcel_id)?.days);
        const dates = today ? Array.from({ length: 14 }, (_, offset) => dateAfterDays(today, offset)) : [];
        return (
          <details class="card crop-planting" key={p.id} open={i === 0} data-testid="detail-planting">
            <summary><strong>{parcelName(p)}</strong><small>{line(p)}</small></summary>
            <div data-testid="crop-sketch">{sketchOf(p)}</div>
            <section data-testid="crop-weather">
              <h3>{t('today.weather')}</h3>
              {days.length === 0 && <p class="muted">{t('today.weather.none')}</p>}
              <ul class="crop-weather-grid">
                {dates.map((date) => {
                  if (!date.known) return null;
                  const day = dayOf(days, date.value);
                  const temperature = day?.tmin !== undefined && day.tmax !== undefined
                    ? t('wx.temp', { min: formatQty(day.tmin), max: formatQty(day.tmax) }) : DASH;
                  const rain = day?.rain !== undefined ? t('wx.rain', { mm: formatQty(day.rain) }) : undefined;
                  const dateLabel = formatDate(date.value);
                  return <li key={date.value} data-testid="crop-weather-day"><time dateTime={date.value}>{dateLabel}</time><span>{temperature}</span>{rain && <span>{rain}</span>}</li>;
                })}
              </ul>
            </section>
          </details>
        );
      })}
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
