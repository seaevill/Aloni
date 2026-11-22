import { useEffect, useState } from 'preact/hooks';
import { activeFarm, dataVersion, db } from '../db';
import { t } from '../i18n';
import { formatQty } from '../i18n/format';
import { copyText, dispatchDay, dispatchText, fractionText } from '../orders/dispatch';
import { loadOrders } from '../orders/store';
import { nextDay } from '../orders/tomorrow';
import { athensToday } from '../plantings/planting';
import { loadDestinations } from '../stock/destination';
import { storeStock } from '../stock/store-stock';
import type { KlouvesOrders } from '../orders/klouves';
import { CropIcon, DetailSheet, ListRow, SheetFact } from './ds';
import { nameOf } from './screens';
import { registerSheet, type SheetProps } from './sheets';
import { useRows } from './useRows';

// «Αύριο φεύγουν» → one crop: who ordered it tomorrow (per customer), what the STORE holds against the total (only crates whose record says «store»; old records without a destination are listed apart, never added),
// and a text to copy for the driver. Information only: nothing is decided and no stock is moved here.
function TomorrowSheet({ id, close }: SheetProps) {
  const farm = activeFarm.value;
  const crops = useRows('crops'); const plantings = useRows('plantings'); const harvests = useRows('job_harvest');
  const [data, setData] = useState<{ orders: KlouvesOrders | undefined; map: Record<string, string>; dest: Awaited<ReturnType<typeof loadDestinations>> } | undefined>(undefined);
  const [msg, setMsg] = useState('');
  useEffect(() => { void (async () => { const o = await loadOrders(db, farm); setData({ ...o, dest: await loadDestinations(db, farm) }); })(); }, [farm, dataVersion.value]);
  if (!data || !crops.rows || !plantings.rows || !harvests.rows) return null;
  const crop = crops.rows.find((c) => c.slug === id);
  const today = athensToday(new Date()) ?? '';
  const day = nextDay(today);
  const clients = dispatchDay(data.orders, data.map, day).map((c) => ({ ...c, items: c.items.filter((i) => i.slug === id) })).map((c) => ({ ...c, total: c.items.reduce((a, i) => a + i.qty, 0) })).filter((c) => c.items.length > 0);
  const ordered = clients.reduce((a, c) => a + c.total, 0);
  const line = storeStock(today, harvests.rows, plantings.rows, crops.rows, data.dest).find((l) => l.slug === id);
  const inStore = line !== undefined && line.store > 0 ? line.store : undefined;
  const txt = dispatchText(clients, { header: nameOf(crop ?? {}) || id, total: (q) => t('ui.tom.title') + ': ' + q });
  const copy = async () => { const r = await copyText(txt, { share: typeof navigator.share === 'function' ? (d) => navigator.share(d) : undefined, clipboard: navigator.clipboard }); setMsg(r === 'copied' || r === 'shared' ? t('ui.tom.copied') : r === 'manual' ? t('ui.tom.manual') : ''); };
  return (
    <DetailSheet heading={nameOf(crop ?? {}) || id} icon={<CropIcon slug={id} size="calc(var(--tile) - var(--sp-16))" />} onClose={close} testid="tomorrow-sheet">
      <h3>{t('ui.tom.customers')}</h3>
      {clients.map((c) => <ListRow key={c.clientId} testid="tomorrow-customer" heading={c.name} meta={t('ui.store.crates', { n: fractionText(c.total) })} />)}
      <span data-testid="tomorrow-store"><SheetFact name={t('ui.store.title')} value={inStore === undefined ? undefined : t('ui.tom.store', { n: formatQty(inStore) })} unknown={t('ui.tom.store.none')} /></span>
      {inStore !== undefined && <p data-testid="tomorrow-gap">{inStore >= ordered ? t('ui.tom.gap.enough') : t('ui.tom.gap.short', { n: fractionText(ordered - inStore) })}</p>}
      {inStore === undefined && <p class="ds-muted">{t('ui.tom.gap.unknown')}</p>}
      {line !== undefined && line.unknown > 0 && <p class="ds-muted">{t('ui.tom.old', { n: formatQty(line.unknown) })}</p>}
      <button class="btn" data-testid="tomorrow-copy" onClick={() => void copy()}>{t('ui.tom.copy')}</button>
      {msg !== '' && <p class="msg" role="status">{msg}</p>}
    </DetailSheet>
  );
}
registerSheet('tomorrow', TomorrowSheet);
