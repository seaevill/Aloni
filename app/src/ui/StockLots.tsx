import { useEffect, useState } from 'preact/hooks';
import { t, formatDateLong, type I18nKey } from '../i18n';
import { formatQty } from '../i18n/format';
import { athensToday } from '../plantings/planting';
import { parseSoonDays, SOON_SETTING } from '../settings/soon';
import { balanceOf, effectiveLots, flagsOf } from '../stock/stock';
import { db } from '../db';
import type { Row } from '../db/schema';
import { nameOf } from './screens';
import { AdjustForm, ReceiveForm } from './StockForms';
import { UnsyncedMark } from './states';
import { useRows } from './useRows';
import { isCalendarDate } from '@aloni/rules-core';

const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const qtyText = (balance: string | undefined, unit: string): string => (balance === undefined ? t('value.unknown') : `${formatQty(balance)} ${unit}`);

/** One product's stock: the lots (expiry with year, balance, flags) and their movements, newest lot first. The ledger is only ever added to. */
export function StockLots({ product, onBack, readOnly = false }: { product: Row; onBack: () => void; readOnly?: boolean }) {
  const [view, setView] = useState<'list' | 'receive' | Row>('list');
  const [soon, setSoon] = useState(parseSoonDays(undefined));
  useEffect(() => { void db.settings.get(SOON_SETTING).then((r) => setSoon(parseSoonDays(r?.value))); }, []);
  const lots = useRows('stock_lots');
  const moves = useRows('stock_movements');
  if (view === 'receive') return <ReceiveForm product={product} onDone={() => setView('list')} />;
  if (view !== 'list') return <AdjustForm lot={view} onDone={() => setView('list')} />;
  const unit = text(product.unit);
  const today = athensToday(new Date()) ?? '';
  const mine = moves.rows?.filter((m) => m.product_id === product.id) ?? [];
  const list = effectiveLots(lots.rows?.filter((l) => l.product_id === product.id) ?? []).sort((a, b) => text(b.created_at).localeCompare(text(a.created_at)));
  const reasonText = (r: unknown) => (r === 'receipt' ? t('stock.reason.receipt') : r === 'spray' ? t('stock.reason.spray') : text(r));
  const cards = list.map((lot) => {
    const own = mine.filter((m) => m.lot_key === lot.lot_key).sort((a, b) => text(a.created_at).localeCompare(text(b.created_at)));
    const balance = balanceOf(own);
    const f = flagsOf(lot, balance, today, soon);
    const flags: I18nKey[] = [];
    if (f.negative) flags.push('stock.flag.negative');
    if (f.unknown) flags.push('stock.flag.unknown');
    if (f.expired) flags.push('stock.flag.expired');
    if (f.soon) flags.push('stock.flag.soon');
    const lines = own.map((m) => ({ id: m.id, line: t('stock.movement', { sign: m.direction === 'in' ? '+' : '−', qty: formatQty(text(m.qty_str)), reason: reasonText(m.reason) }) }));
    return {
      lot, flags, lines,
      title: text(lot.batch) ? t('stock.batch', { batch: text(lot.batch) }) : t('stock.noBatch'),
      expiry: t('stock.expiry', { date: isCalendarDate(text(lot.expiry)) ? formatDateLong(text(lot.expiry)) : t('value.unknown') }),
      balance: t('stock.balance', { qty: qtyText(balance, unit) }),
    };
  });
  return (
    <section>
      <h1>{nameOf(product)}</h1>
      <button class="btn secondary" onClick={onBack}>{t('info.back')}</button>
      {lots.rows && <p class="card" data-testid="stock-total">{t('stock.total', { qty: qtyText(balanceOf(mine), unit) })}</p>}
      {!readOnly && <button class="btn" data-testid="receive-open" onClick={() => setView('receive')}>{t('stock.receive')}</button>}
      {lots.rows && list.length === 0 && <p class="muted" data-testid="stock-empty">{t('stock.empty')}</p>}
      <p class="muted">{t('stock.note')}</p>
      {cards.map((c) => (
        <div class="card" key={c.lot.id} data-testid="lot">{c.title}
          <small>{c.expiry}</small>
          <small data-testid="lot-balance">{c.balance}</small>
          {c.flags.map((k) => <span class="badge warn" key={k} data-testid="lot-flag">{t(k)}</span>)}
          {c.lines.map((m) => <small key={m.id} data-testid="movement">{m.line}</small>)}
          <UnsyncedMark id={c.lot.id} />
          {!readOnly && <button class="btn secondary" data-testid="adjust-open" onClick={() => setView(c.lot)}>{t('stock.adjust')}</button>}
        </div>
      ))}
    </section>
  );
}
