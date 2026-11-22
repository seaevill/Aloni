import { useEffect, useState } from 'preact/hooks';
import { dataVersion, db, activeFarm } from '../db';
import { lang, t } from '../i18n';
import { formatQty } from '../i18n/format';
import { loadOrders } from '../orders/store';
import { supplyByCrop } from '../orders/available';
import { fractionText } from '../orders/dispatch';
import { cutTodayBySlug, nextDay, tomorrowBoard } from '../orders/tomorrow';
import { athensToday } from '../plantings/planting';
import { storeStock, type StoreLine } from '../stock/store-stock';
import { loadDestinations } from '../stock/destination';
import { harvestGate } from '../spray/harvest';
import { instantOf } from '../spray/time';
import el from '../content/harvest/el.json';
import en from '../content/harvest/en.json';
import hi from '../content/harvest/hi.json';
import tr from '../content/harvest/tr.json';
import { Chip, CropIcon, DetailSheet, ListRow, SheetFact } from './ds';
import { openSheet } from './nav';
import { nameOf } from './screens';
import { registerSheet, type SheetProps } from './sheets';
import { useRows } from './useRows';

// Αποθήκη → «Συγκομιδή στην αποθήκη»: per crop the crates that the records say went to the STORE, how long the oldest have been there, and what leaves tomorrow. A row opens the split store / direct dispatch / unknown.
// Records without a destination are old: they are listed as «άγνωστο – παλιά καταγραφή» and never added to the store. Information only.
function useHarvestData() {
  const harvests = useRows('job_harvest'); const plantings = useRows('plantings'); const crops = useRows('crops');
  const links = useRows('job_plantings'); const sprays = useRows('job_spray'); const labels = useRows('label_uses');
  const now = new Date();
  const today = athensToday(now) ?? '';
  const at = instantOf(now);
  const farm = activeFarm.value;
  const [dest, setDest] = useState<{ farm: string; records: Awaited<ReturnType<typeof loadDestinations>> }>();
  useEffect(() => {
    let live = true;
    void loadDestinations(db, farm).then((records) => { if (live) setDest({ farm, records }); }).catch(() => {});
    return () => { live = false; };
  }, [farm, dataVersion.value]);
  const farmHarvests = harvests.rows?.filter((row) => row.farm_id === farm);
  const eligible = new Set<string>();
  if (farmHarvests && plantings.rows && links.rows && sprays.rows && labels.rows && at) {
    const permitted = new Set(plantings.rows.filter((planting) => planting.farm_id === farm
      && harvestGate(planting.id, at, links.rows ?? [], sprays.rows ?? [], plantings.rows ?? [], labels.rows ?? []).ok
    ).map((planting) => planting.id));
    for (const row of farmHarvests) {
      if (typeof row.planting_id === 'string' && permitted.has(row.planting_id)) eligible.add(row.id);
    }
  }
  const lines = farmHarvests && plantings.rows && crops.rows
    ? storeStock(today, farmHarvests, plantings.rows, crops.rows, dest?.farm === farm ? dest.records : undefined, eligible)
    : undefined;
  return { lines, crops: crops.rows ?? [], today };
}

const copy = { el, en, hi, tr };
const cropName = (crops: readonly import('../db/schema').Row[], slug: string): string => nameOf(crops.find((c) => c.slug === slug) ?? {}) || slug;
const ageChip = (l: StoreLine) => (l.ageDays === undefined ? null : <span data-testid="store-age"><Chip tone={l.ageDays >= 3 ? 'warn' : 'info'}>{l.ageDays === 0 ? t('ui.store.age.today') : t('ui.store.age', { n: formatQty(l.ageDays) })}</Chip></span>);

export function StoreStock() {
  const { lines, crops, today } = useHarvestData();
  const [tomorrow, setTomorrow] = useState<string | undefined>(undefined);
  const harvests = useRows('job_harvest'); const plantings = useRows('plantings'); const links = useRows('job_plantings'); const sprays = useRows('job_spray'); const labels = useRows('label_uses');
  const farm = activeFarm.value;
  useEffect(() => {
    let live = true;
    void loadOrders(db, farm).then((o) => {
      if (!live) return;
      if (!o.orders?.days) { setTomorrow(t('ui.store.tomorrow.unknown')); return; }
      const supply = supplyByCrop(new Date().toISOString(), crops, plantings.rows ?? [], links.rows ?? [], sprays.rows ?? [], harvests.rows ?? [], labels.rows ?? []);
      const board = tomorrowBoard(o.orders, o.map, supply, cutTodayBySlug(today, harvests.rows ?? [], plantings.rows ?? [], crops), nextDay(today));
      setTomorrow(t('ui.store.tomorrow', { n: fractionText(board.rows.reduce((a, r) => a + r.ordered, 0)) }));
    }).catch(() => { if (live) setTomorrow(t('ui.store.tomorrow.unknown')); });
    return () => { live = false; };
  }, [farm, dataVersion.value, crops.length, harvests.rows?.length]);
  const shown = (lines ?? []).filter((l) => l.store > 0);
  return (
    <section data-testid="store-stock">
      <h2>{t('ui.store.title')}</h2>
      {lines !== undefined && shown.length === 0 && !lines.some((row) => row.hasUncounted) && <p class="muted" data-testid="store-none">{t('ui.store.none')}</p>}
      {shown.map((l) => <ListRow key={l.slug} testid="store-row" icon={<CropIcon slug={l.slug} size="calc(var(--tile) - var(--sp-8))" />} heading={cropName(crops, l.slug)} meta={t('ui.store.crates', { n: formatQty(l.store) })} trailing={ageChip(l)} onClick={() => openSheet('store', l.slug)} />)}
      {lines?.some((row) => row.hasUncounted) && <p class="muted">{copy[lang.value].excluded}</p>}
      {tomorrow !== undefined && <p class="muted" data-testid="store-tomorrow">{tomorrow}</p>}
      <p class="muted">{t('ui.store.note')}</p>
    </section>
  );
}

function StoreSheet({ id, close }: SheetProps) {
  const { lines, crops } = useHarvestData();
  if (!lines) return null;
  const l = lines.find((x) => x.slug === id);
  if (!l) return <DetailSheet heading={t('ui.sheet.notfound.head')} onClose={close} testid="sheet-notfound"><p class="ds-muted">{t('ui.sheet.notfound.body')}</p></DetailSheet>;
  return (
    <DetailSheet heading={cropName(crops, l.slug)} icon={<CropIcon slug={l.slug} size="calc(var(--tile) - var(--sp-16))" />} onClose={close} testid="store-sheet">
      <span data-testid="store-split-store"><SheetFact name={t('ui.store.title')} value={l.store > 0 ? t('ui.store.split.store', { n: formatQty(l.store) }) : t('ui.done.dest.store')} /></span>
      <span data-testid="store-split-dispatch"><SheetFact name={t('ui.store.title')} value={l.dispatch > 0 ? t('ui.store.split.dispatch', { n: formatQty(l.dispatch) }) : t('ui.done.dest.dispatch')} /></span>
      <span data-testid="store-split-unknown"><SheetFact name={t('ui.store.title')} value={l.hasUnknownDestination ? t('ui.done.dest.unknown') : t('ui.store.split.unknown', { n: t('list.empty') })} /></span>
      {l.hasUncounted && <p class="muted">{copy[lang.value].excluded}</p>}
      {l.unreadable > 0 && <p class="ds-muted">{t('ui.store.unreadable', { n: formatQty(l.unreadable) })}</p>}
      <p class="ds-muted">{t('ui.store.note')}</p>
    </DetailSheet>
  );
}
registerSheet('store', StoreSheet);
