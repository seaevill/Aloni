import { useEffect, useState } from 'preact/hooks';
import { activeFarm, db } from '../db';
import { loadCuts, type CutRecord } from '../cuts/cuts';
import { ParcelCut, METHOD_KEYS } from './ParcelCut';
import { formatDate, formatDateTime, t, type I18nKey } from '../i18n';
import { formatArea, formatQty } from '../i18n/format';
import { athensToday, validDate } from '../plantings/planting';
import { cutFromParcel } from '../spray/harvest';
import { effectiveSprays } from '../spray/spray';
import { instantOf } from '../spray/time';
import { parcelTimeline, type TimelineEvent } from '../summary/timeline';
import { dayOf, parseDays, provenance } from '../weather/strip';
import type { Row } from '../db/schema';
import { BackBar } from './BackBar';
import { ParcelSketch } from './ParcelSketch';
import { WaterCard } from './WaterCard';
import { KaekCard } from './KaekCard';
import { ParcelYield } from './ParcelYield';
import { FieldWorkCard } from './FieldWorkCard';
import { plantingMarks } from '../plantings/marks';
import { CropTips } from './CropTips';
import { DetailSheet, SheetFact } from './ds';
import { EditTrail } from './EditTrail';
import { TOPO_KEYS } from './ParcelForm';
import { STATUS_KEYS } from './PlantingForm';
import { nameOf } from './screens';
import { useRows } from './useRows';
import { useWeather } from './useWeather';

const text = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
const DASH = '\u2014';

/** Tapped from the parcel list (prototype «Parcel detail»): a sketch, the facts, today's weather, the plantings and the last sprayings on THIS parcel. Everything is read from the same records; nothing is decided here. */
export function ParcelDetail({ parcel, onBack, onEdit, onAnalyses, readOnly }: { parcel: Row; onBack: () => void; onEdit: () => void; onAnalyses: () => void; readOnly: boolean }) {
  const labelRows = useRows('label_uses'); const plantings = useRows('plantings'); const crops = useRows('crops'); const links = useRows('job_plantings'); const sprays = useRows('job_spray'); const products = useRows('products'); const harvests = useRows('job_harvest');
  const weather = useWeather();
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [cropTips, setCropTips] = useState<Row>();
  const [cuts, setCuts] = useState<CutRecord[]>([]);
  const reloadCuts = () => void loadCuts(db, activeFarm.value).then(setCuts);
  useEffect(reloadCuts, [parcel.id]);
  const mine = (plantings.rows ?? []).filter((p) => p.parcel_id === parcel.id && !p.deleted_at);
  const cut = cutFromParcel(parcel.id, instantOf(new Date()) ?? '', plantings.rows ?? [], links.rows ?? [], sprays.rows ?? [], labelRows.rows ?? []);
  const marks = plantingMarks(text(parcel.area_str), mine.map((p) => ({ id: text(p.id), area: text(p.area_str) })));
  const jobIds = new Set((links.rows ?? []).filter((l) => mine.some((p) => p.id === l.planting_id)).map((l) => l.job_id));
  const last = effectiveSprays((sprays.rows ?? []).filter((s) => jobIds.has(s.job_id))).sort((a, b) => text(b.sprayed_at).localeCompare(text(a.sprayed_at))).slice(0, 5);
  const stream = parcelTimeline(parcel.id, plantings.rows ?? [], links.rows ?? [], effectiveSprays(sprays.rows ?? []), harvests.rows ?? [],
    { crop: (id) => nameOf(crops.rows?.find((c) => c.id === id) ?? {}), product: (id) => nameOf(products.rows?.find((p) => p.id === id) ?? {}) },
    cuts.filter((c) => c.parcel_id === parcel.id));
  const eventLine = (e: TimelineEvent): string => (e.kind === 'sown' ? t('timeline.sown', { crop: e.crop })
    : e.kind === 'cut' ? t('timeline.cut', { method: t(METHOD_KEYS[e.method]) })
    : e.kind === 'harvest' ? t('timeline.harvest', { crop: e.crop, n: formatQty(e.crates) })
      : [t('timeline.spray', { product: e.product }), e.reiUntil ? t('timeline.rei', { d: formatDateTime(e.reiUntil) }) : '', e.phiUntil ? t('timeline.phi', { d: formatDateTime(e.phiUntil) }) : ''].filter(Boolean).join(' · '));
  const eventDate = (e: TimelineEvent): string => (e.kind === 'sown' || e.kind === 'cut' ? (validDate(e.at) ? formatDate(e.at) : '') : formatDateTime(e.at));
  const waterCrops = [...new Set(mine.map((p) => String(p.crop_id)))].flatMap((cid) => { const crop = crops.rows?.find((c) => c.id === cid); return crop ? [{ crop, areas: mine.filter((p) => String(p.crop_id) === cid).map((p) => text(p.area_str)) }] : []; });
  const days = parseDays(weather.find((w) => w.parcel_id === parcel.id)?.days);
  const wx = dayOf(days, athensToday(new Date()) ?? '');
  const weatherSource = provenance([days], Date.now());
  const wxLine = wx && wx.tmin !== undefined && wx.tmax !== undefined ? [t('wx.temp', { min: formatQty(wx.tmin), max: formatQty(wx.tmax) }), wx.rain !== undefined ? t('wx.rain', { mm: formatQty(wx.rain) }) : '', wx.gust !== undefined ? t('wx.gust', { kmh: formatQty(wx.gust) }) : ''].filter((x) => x !== '').join(' · ') : t('today.weather.none');
  const cropOf = (planting: Row) => crops.rows?.find((crop) => crop.id === planting.crop_id);
  const plantingLine = (p: Row): string => { const d = text(p.sown_on); const sk = (STATUS_KEYS as Record<string, I18nKey>)[text(p.status)]; return [formatArea(p.area_str as string | number), validDate(d) ? formatDate(d) : '', sk ? t(sk) : ''].filter((x) => x !== '').join(' · '); };
  const cutLine = cut.state === 'free' ? t('cut.free') : cut.state === 'unknown' ? t('cut.unknown') : t('cut.from', { d: formatDateTime(cut.at) });
  const topoKey = (TOPO_KEYS as Record<string, I18nKey>)[text(parcel.topo_class)];
  const rows: Array<[I18nKey, string]> = [
    ['detail.area', formatArea(parcel.area_str as string | number)],
    ['detail.topo', topoKey ? t(topoKey) : DASH],
    ['detail.elevation', parcel.elevation_m === undefined || parcel.elevation_m === null ? DASH : `${formatQty(parcel.elevation_m as number | string)} m`],
    ['detail.osde', text(parcel.opekepe_code) || DASH],
  ];
  return (
    <section class="detail" data-testid="parcel-detail">
      <header class="band">
        <BackBar onBack={onBack} testId="detail-back" />
        <h1 tabIndex={-1}>{text(parcel.name)}</h1>
      </header>
      <ParcelSketch boundary={parcel.boundary} sample={readOnly ? parcel.sketch : undefined} marks={marks} clipKey={`pd-${text(parcel.id)}`} />
      {marks.length > 0 && <>
        <small class="sketch-note" data-testid="sketch-note">{t('ui.sketch.note')}</small>
        <div class="tags">{marks.map((mark) => {
          const planting = mine.find((p) => p.id === mark.id);
          if (!planting) return null;
          const crop = cropOf(planting);
          return <button type="button" class="tag-btn" key={mark.id} data-testid="planting-sketch-label" disabled={!crop} onClick={() => setCropTips(crop)}>
            {nameOf(crop ?? {}) || t('value.unknown')} {formatArea(planting.area_str as string | number)}
          </button>;
        })}</div>
      </>}
      {mine.length > 0 && marks.length === 0 && <small class="sketch-note" data-testid="sketch-unknown">{t('ui.sketch.unknown')}</small>}
      <div class="card facts">{rows.map(([k, v]) => <div class="fact" key={k}><span>{t(k)}</span><strong>{v}</strong></div>)}</div>
      <div class={cut.state === 'unknown' ? 'card field blocked' : 'card'}><small data-testid="detail-cut">{cutLine}</small></div>
      <KaekCard parcelId={String(parcel.id)} readOnly={readOnly} />
      <ParcelCut parcelId={String(parcel.id)} cuts={cuts} onChange={reloadCuts} />
      <h2>{t('detail.weather')}</h2>
      <button type="button" class="row" data-testid="detail-weather" onClick={() => setWeatherOpen(true)}>
        <span>{wxLine}</span><span class="chev" aria-hidden="true" />
      </button>
      {weatherOpen && <DetailSheet heading={t('detail.weather')} onClose={() => setWeatherOpen(false)} testid="parcel-weather-source">
        <h3>{text(parcel.name)}</h3>
        {wx ? <>
          <p>{wxLine}</p>
          <SheetFact name={t('wx.wind')} value={wx.wind === undefined ? undefined : t('wx.kmh', { v: formatQty(wx.wind) })} />
          <SheetFact name={t('ui.weather.source')} value={weatherSource?.names.join(', ')} unknown={t('value.unknown')} />
          <SheetFact name={t('ui.weather.issued')} value={weatherSource?.issued ? formatDateTime(weatherSource.issued) : undefined} unknown={t('ui.weather.issued.unknown')} />
        </> : <p>{t('ui.weather.none.why')}</p>}
      </DetailSheet>}
      <h2>{t('detail.plantings')}</h2>
      {mine.length === 0 && <p class="muted">{t('list.empty')}</p>}
      {mine.map((p) => {
        const crop = cropOf(p);
        const label = nameOf(crop ?? {}) || t('value.unknown');
        return <button type="button" class="card planting-open" key={p.id} data-testid="detail-planting" disabled={!crop} onClick={() => setCropTips(crop)}>
          <strong>{label}</strong><small>{plantingLine(p)}</small>
        </button>;
      })}
      {cropTips && <CropTips slug={text(cropTips.slug)} onClose={() => setCropTips(undefined)} />}
      <FieldWorkCard parcelId={String(parcel.id)} days={days} />
      <ParcelYield parcel={parcel} plantings={plantings.rows ?? []} harvests={harvests.rows ?? []} cropName={(pid) => nameOf(crops.rows?.find((c) => c.id === mine.find((p) => p.id === pid)?.crop_id) ?? {})} />
      <WaterCard days={days} crops={waterCrops} />
      <h2>{t('detail.sprays')}</h2>
      {last.length === 0 && <p class="muted">{t('spray.empty')}</p>}
      {last.map((s) => <div class="card" key={s.id} data-testid="detail-spray">{nameOf(products.rows?.find((p) => p.id === s.product_id) ?? {})}<small>{formatDateTime(text(s.sprayed_at))}</small></div>)}
      <h2>{t('timeline.title')}</h2>
      <div data-testid="timeline">
        {stream.length === 0 && <p class="muted">{t('timeline.empty')}</p>}
        {stream.map((e) => <div class="card" key={`${e.kind}-${e.id}`} data-testid="timeline-event" data-kind={e.kind} data-at={e.at}>{eventLine(e)}<small>{eventDate(e)}</small></div>)}
      </div>
      <button class="row" data-testid="analysis-open" onClick={onAnalyses}><span>{t('analysis.open')}</span><span aria-hidden="true" class="chev" /></button>
      {!readOnly && <button class="row" data-testid="parcel-edit" onClick={onEdit}><span>{t('edit.open')}</span><span aria-hidden="true" class="chev" /></button>}
      <EditTrail row={parcel} />
    </section>
  );
}
