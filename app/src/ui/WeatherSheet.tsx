import { formatDate, formatDateTime, t } from '../i18n';
import { formatQty } from '../i18n/format';
import { athensToday } from '../plantings/planting';
import { farmDay, parseDays, provenance, type Day } from '../weather/strip';
import { BigNum, WeatherStrip, type WeatherDay } from './ds/DataViz';
import { Chip } from './ds/Chip';
import { DetailSheet, SheetFact } from './ds/DetailSheet';
import { Icon } from './icons/Icon';
import { registerSheet, type SheetProps } from './sheets';
import { useWeather } from './useWeather';

// Σήμερα → the weather tiles open this sheet: the next days in one compact table, today's wind, gusts and rain, WHERE the numbers come from and WHEN they were issued. No stored weather says so, with the reason.
const DAY_MS = 86_400_000;
const DASH_FREE = (n: number | undefined, key: 'wx.kmh' | 'wx.pct'): string | undefined => (n === undefined ? undefined : t(key, { v: formatQty(n) }));
const label = (iso: string): string => formatDate(iso).split(' ').slice(0, 2).join(' ');

function WeatherSheet({ close }: SheetProps) {
  const rows = useWeather();
  const perParcel: Day[][] = rows.map((w) => parseDays(w.days));
  const today = athensToday(new Date()) ?? '';
  const base = Date.parse(`${today}T12:00:00Z`);
  const dates = Number.isNaN(base) ? [] : Array.from({ length: 5 }, (_, i) => new Date(base + i * DAY_MS).toISOString().slice(0, 10));
  const days = dates.map((d) => farmDay(perParcel, d));
  const strip: WeatherDay[] = dates.map((d, i) => {
    const x = days[i];
    return { name: label(d), ...(x?.tmax !== undefined ? { tmax: t('ui.weather.deg', { v: formatQty(x.tmax) }) } : {}), ...(x?.tmin !== undefined ? { tmin: t('ui.weather.deg', { v: formatQty(x.tmin) }) } : {}), ...(x?.rain !== undefined ? { rain: t('wx.rain', { mm: formatQty(x.rain) }) } : {}), ...(x?.wind !== undefined ? { wind: DASH_FREE(x.wind, 'wx.kmh') ?? '' } : {}) };
  });
  const any = days.some((d) => d !== undefined);
  const src = provenance(perParcel, Date.now());
  const now = days[0];
  return (
    <DetailSheet heading={t('today.weather')} icon={<Icon name="wind" />} onClose={close} testid="sheet-weather">
      {!any && (
        <>
          <Chip tone="unknown">{t('ui.weather.none.chip')}</Chip>
          <p class="ds-muted" data-testid="sheet-why">{t('ui.weather.none.why')}</p>
        </>
      )}
      {any && (
        <>
          <div class="ds-pair">
            <BigNum caption={t('wx.wind')} value={now?.wind === undefined ? undefined : formatQty(now.wind)} unit={t('ui.weather.kmh')} size="small" />
            <BigNum caption={t('ui.weather.gust')} value={now?.gust === undefined ? undefined : formatQty(now.gust)} unit={t('ui.weather.kmh')} size="small" />
            <BigNum caption={t('wx.rain.today')} value={now?.rain === undefined ? undefined : formatQty(now.rain)} unit={t('ui.weather.mm')} size="small" />
          </div>
          <p class="ds-muted">{t('ui.weather.legend')}</p>
          <WeatherStrip days={strip} />
          <SheetFact name={t('ui.weather.source')} value={src ? src.names.join(', ') : undefined} unknown={t('ui.weather.source.demo')} />
          <SheetFact name={t('ui.weather.issued')} value={src?.issued ? formatDateTime(src.issued) : undefined} unknown={t('ui.weather.issued.unknown')} />
          {src?.stale && <Chip tone="warn">{t('ui.weather.stale')}</Chip>}
        </>
      )}
      <SheetFact name={t('ui.weather.hourly')} unknown={t('ui.weather.hourly.why')} />
    </DetailSheet>
  );
}
registerSheet('weather', WeatherSheet);
