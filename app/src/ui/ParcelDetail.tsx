import { formatDate, formatDateTime, t, type I18nKey } from '../i18n';
import { formatArea, formatQty } from '../i18n/format';
import { validBoundary, type Boundary } from '../map/geo';
import { athensToday, validDate } from '../plantings/planting';
import { cutFromParcel } from '../spray/harvest';
import { effectiveSprays } from '../spray/spray';
import { instantOf } from '../spray/time';
import { dayOf, parseDays } from '../weather/strip';
import type { Row } from '../db/schema';
import { BackBar } from './BackBar';
import { EditTrail } from './EditTrail';
import { TOPO_KEYS } from './ParcelForm';
import { STATUS_KEYS } from './PlantingForm';
import { nameOf } from './screens';
import { useRows } from './useRows';
import { useWeather } from './useWeather';

const text = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
const DASH = '\u2014';

/** The outline as a small SVG (the prototype's «sketch»): the drawn boundary scaled to the box, north up. Nothing is drawn without a boundary. */
function Sketch({ b }: { b: Boundary }) {
  const ring = b.coordinates[0];
  const xs = ring.map((p) => p[0]); const ys = ring.map((p) => p[1]);
  const x0 = Math.min(...xs); const y0 = Math.min(...ys); const w = Math.max(...xs) - x0; const h = Math.max(...ys) - y0;
  const span = Math.max(w, h);
  if (span <= 0) return null;                  // a point or a line has no outline to draw
  const k = 100 / span;
  const pts = ring.map((p) => `${(p[0] - x0) * k},${(h - (p[1] - y0)) * k}`).join(' ');
  return <svg class="sketch" viewBox={`-4 -4 ${w * k + 8} ${h * k + 8}`} role="img" aria-label={t('detail.sketch')} data-testid="parcel-sketch"><polygon points={pts} /></svg>;
}

/** Tapped from the parcel list (prototype «Parcel detail»): a sketch, the facts, today's weather, the plantings and the last sprayings on THIS parcel. Everything is read from the same records; nothing is decided here. */
export function ParcelDetail({ parcel, onBack, onEdit, onAnalyses, readOnly }: { parcel: Row; onBack: () => void; onEdit: () => void; onAnalyses: () => void; readOnly: boolean }) {
  const labelRows = useRows('label_uses'); const plantings = useRows('plantings'); const crops = useRows('crops'); const links = useRows('job_plantings'); const sprays = useRows('job_spray'); const products = useRows('products');
  const weather = useWeather();
  const mine = (plantings.rows ?? []).filter((p) => p.parcel_id === parcel.id && !p.deleted_at);
  const cut = cutFromParcel(parcel.id, instantOf(new Date()) ?? '', plantings.rows ?? [], links.rows ?? [], sprays.rows ?? [], labelRows.rows ?? []);
  const jobIds = new Set((links.rows ?? []).filter((l) => mine.some((p) => p.id === l.planting_id)).map((l) => l.job_id));
  const last = effectiveSprays((sprays.rows ?? []).filter((s) => jobIds.has(s.job_id))).sort((a, b) => text(b.sprayed_at).localeCompare(text(a.sprayed_at))).slice(0, 5);
  const wx = dayOf(parseDays(weather.find((w) => w.parcel_id === parcel.id)?.days), athensToday(new Date()) ?? '');
  const wxLine = wx && wx.tmin !== undefined && wx.tmax !== undefined ? [t('wx.temp', { min: formatQty(wx.tmin), max: formatQty(wx.tmax) }), wx.rain !== undefined ? t('wx.rain', { mm: formatQty(wx.rain) }) : '', wx.gust !== undefined ? t('wx.gust', { kmh: formatQty(wx.gust) }) : ''].filter((x) => x !== '').join(' · ') : t('today.weather.none');
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
      {validBoundary(parcel.boundary) ? <Sketch b={parcel.boundary} /> : <p class="muted" data-testid="parcel-nosketch">{t('detail.nosketch')}</p>}
      <div class="card facts">{rows.map(([k, v]) => <div class="fact" key={k}><span>{t(k)}</span><strong>{v}</strong></div>)}</div>
      <div class={cut.state === 'unknown' ? 'card field blocked' : 'card'}><small data-testid="detail-cut">{cutLine}</small></div>
      <h2>{t('detail.weather')}</h2>
      <div class="card" data-testid="detail-weather"><small>{wxLine}</small></div>
      <h2>{t('detail.plantings')}</h2>
      {mine.length === 0 && <p class="muted">{t('list.empty')}</p>}
      {mine.map((p) => <div class="card" key={p.id} data-testid="detail-planting">{nameOf(crops.rows?.find((c) => c.id === p.crop_id) ?? {})}<small>{plantingLine(p)}</small></div>)}
      <h2>{t('detail.sprays')}</h2>
      {last.length === 0 && <p class="muted">{t('spray.empty')}</p>}
      {last.map((s) => <div class="card" key={s.id} data-testid="detail-spray">{nameOf(products.rows?.find((p) => p.id === s.product_id) ?? {})}<small>{formatDateTime(text(s.sprayed_at))}</small></div>)}
      <button class="row" data-testid="analysis-open" onClick={onAnalyses}><span>{t('analysis.open')}</span><span aria-hidden="true" class="chev" /></button>
      {!readOnly && <button class="row" data-testid="parcel-edit" onClick={onEdit}><span>{t('edit.open')}</span><span aria-hidden="true" class="chev" /></button>}
      <EditTrail row={parcel} />
    </section>
  );
}
