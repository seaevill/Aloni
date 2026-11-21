import { dateAfterDays, isCalendarDate, parseWhole, unknown } from '@aloni/rules-core';
import { weeklyCopy } from '../../content/weekly-report';
import { activeFarm } from '../../db';
import type { Row } from '../../db/schema';
import { formatDateTime, formatDateLong, lang, t } from '../../i18n';
import { formatQty } from '../../i18n/format';
import { effectiveSprays } from '../../spray/spray';
import { instantOf } from '../../spray/time';
import { balanceOf, effectiveLots, flagsOf } from '../../stock/stock';
import { dayOf } from '../../summary/today';
import { plantingWait } from '../../summary/wait';
import { Card, PageHead, WeekBars } from '../ds';
import { nameOf } from '../screens';
import { useRows } from '../useRows';
import '../weekly-report-v2.css';

const detailLine = (...parts: string[]) => parts.join(' · ');
const text = (value: unknown) => typeof value === 'string' ? value : '';
const entryName = (rows: readonly Row[], id: unknown) => {
  const row = rows.find((r) => r.id === id);
  return row ? nameOf(row) : t('value.unknown');
};

export function WeeklyReport({ onBack }: { onBack: () => void }) {
  const harvests = useRows('job_harvest');
  const plantings = useRows('plantings');
  const parcels = useRows('parcels');
  const crops = useRows('crops');
  const sprays = useRows('job_spray');
  const links = useRows('job_plantings');
  const labels = useRows('label_uses');
  const jobs = useRows('jobs');
  const products = useRows('products');
  const lots = useRows('stock_lots');
  const moves = useRows('stock_movements');
  const sources = [harvests, plantings, parcels, crops, sprays, links, labels, jobs, products, lots, moves];
  const copy = weeklyCopy[lang.value];
  const now = new Date();
  const today = dayOf(now.toISOString());
  const from = dateAfterDays(today, -6);
  const range = from.known ? [formatDateLong(from.value), formatDateLong(today)].join(' – ') : undefined;
  const prior = (value: unknown) => {
    const at = Date.parse(text(value));
    return Number.isFinite(at) && at <= now.getTime();
  };
  const inWeek = (value: unknown) => from.known && prior(value) && dayOf(value) >= from.value;
  const own = (source: ReturnType<typeof useRows>) => source.rows?.filter((r) => r.farm_id === activeFarm.value && !r.deleted_at) ?? [];
  const plantingRows = own(plantings);
  const sprayRows = effectiveSprays(own(sprays));
  const cropRows = own(crops);
  const parcelRows = own(parcels);
  const productRows = own(products);
  const linkRows = own(links);
  const labelRows = own(labels);
  const movementRows = own(moves);
  const excludes: Row[] = [];
  const groups = new Map<unknown, { row: Row; total: number; records: Row[] }>();
  for (const h of own(harvests)) {
    if (!inWeek(h.harvested_at)) continue;
    const planting = plantingRows.find((p) => p.id === h.planting_id);
    const crop = cropRows.find((r) => r.id === planting?.crop_id);
    const quantity = parseWhole<'Crates'>(text(h.crates_str));
    const at = instantOf(new Date(text(h.harvested_at))) ?? '';
    // Historical sprays after this record cannot put it on hold. Unreadable end times still block it.
    const preceding = sprayRows.filter((r) => !dayOf(r.sprayed_at) || Date.parse(text(r.sprayed_at)) <= Date.parse(at));
    if (!crop || !planting || !quantity.known || plantingWait(text(planting.id), at, linkRows, preceding, plantingRows, labelRows).state !== 'free') {
      excludes.push(h);
      continue;
    }
    const group = groups.get(crop.id) ?? { row: crop, total: 0, records: [] };
    group.total += quantity.value;
    group.records.push(h);
    groups.set(crop.id, group);
  }
  const sprayParcels = (spray: Row) => {
    const ids = new Set(linkRows.filter((l) => l.job_id === spray.job_id)
      .map((l) => plantingRows.find((p) => p.id === l.planting_id)?.parcel_id));
    return ids.size ? [...ids].map((id) => entryName(parcelRows, id)).join(' · ') : t('value.unknown');
  };
  const inSprays = sprayRows.filter((r) => inWeek(r.sprayed_at));
  const done = own(jobs).filter((r) => r.status === 'done');
  const inJobs = done.filter((r) => inWeek(r.done_at));
  const missingDate = [...own(harvests).map((r) => r.harvested_at), ...sprayRows.map((r) => r.sprayed_at), ...done.map((r) => r.done_at)].some((at) => dayOf(at) === '');
  const stock = effectiveLots(own(lots)).flatMap((lot) => {
    const ledger = movementRows.filter((r) => r.lot_key === lot.lot_key && r.product_id === lot.product_id);
    const f = flagsOf(lot, ledger.length ? balanceOf(ledger) : undefined, today, unknown('missing'));
    const expired = isCalendarDate(text(lot.expiry)) && f.expired;
    const caption = [
      expired ? t('stock.flag.expired') : '',
      f.negative ? t('stock.flag.negative') : '',
      f.unknown ? t('stock.flag.unknown') : '',
      !isCalendarDate(text(lot.expiry)) ? copy.expiryMissing : '',
    ].filter(Boolean).join(' · ');
    return caption ? [{ lot, caption }] : [];
  });
  const empty = <p>{copy.empty}</p>;
  const amountLines = (records: readonly Row[], showQuantity = true) => <ul>{records.map((r) => {
    const at = formatDateTime(text(r.harvested_at));
    const line = showQuantity ? detailLine(at, formatQty(text(r.crates_str))) : at;
    return <li key={r.id}>{line}</li>;
  })}</ul>;
  return <section class="weekly-report" data-testid="weekly-report">
    <div class="weekly-report-controls"><PageHead heading={copy.title} back={onBack} backText={t('info.back')} /></div>
    <h1 class="weekly-report-print-title">{copy.title}</h1>
    {range && <p data-testid="weekly-range">{range}</p>}
    {sources.some((s) => s.failed) ? <p role="alert">{t('state.error')}</p> : sources.some((s) => s.rows === null) ? <p role="status">{copy.loading}</p> : <>
      <button class="btn secondary weekly-report-controls" onClick={() => window.print()}>{copy.print}</button>
      <h2>{copy.harvest}</h2>
      <Card>{groups.size > 0 ? <>
        <WeekBars weeks={[...groups.values()].map((g) => ({ name: nameOf(g.row), eligible: g.total, orders: null, unknown: null }))} />
        {[...groups.values()].map((g) => <details key={g.row.id}>
          <summary>{detailLine(nameOf(g.row), formatQty(g.total))}</summary>
          {amountLines(g.records)}
        </details>)}
      </> : empty}
        {excludes.length > 0 && <details><summary>{copy.excluded}</summary>{amountLines(excludes, false)}</details>}
      </Card>
      <h2>{t('spray.title')}</h2>
      <Card>{inSprays.length ? <ul>{inSprays.map((r) => <li key={r.id}>
        {detailLine(entryName(productRows, r.product_id), sprayParcels(r), formatDateTime(text(r.sprayed_at)))}
      </li>)}</ul> : empty}</Card>
      <h2>{copy.jobs}</h2>
      <Card>{inJobs.length ? <ul>{inJobs.map((r) => <li key={r.id}>{detailLine(entryName(parcelRows, r.parcel_id), formatDateTime(text(r.done_at)))}</li>)}</ul> : empty}</Card>
      {missingDate && <p>{copy.unreadable}</p>}
      <h2>{copy.stock}</h2>
      <Card>{stock.length ? <ul>{stock.map(({ lot, caption }) => <li key={lot.id}>
        {detailLine(entryName(productRows, lot.product_id), text(lot.batch) || copy.lot, caption)}
      </li>)}</ul> : empty}</Card>
    </>}
  </section>;
}
