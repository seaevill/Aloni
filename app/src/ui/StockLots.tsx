import { useEffect, useState } from 'preact/hooks';
import { t, lang, formatDateLong, formatDateTime, type I18nKey } from '../i18n';
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
import { BackBar } from './BackBar';
import { Card, Chip, ListRow, PageHead } from './ds';
import el from '../content/stock/el.json';
import tr from '../content/stock/tr.json';
import en from '../content/stock/en.json';
import hi from '../content/stock/hi.json';

const copy = { el, tr, en, hi };
const dayMs = 86_400_000;
const asDate = (value: unknown) => (typeof value === 'string' && isCalendarDate(value) ? value : undefined);

const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const qtyText = (balance: string | undefined, unit: string): string => (balance === undefined ? t('value.unknown') : `${formatQty(balance)} ${unit}`);

/** One product's stock: the lots (expiry with year, balance, flags) and their movements, newest lot first. The ledger is only ever added to. */
export function StockLots({ product, onBack, readOnly = false }: { product: Row; onBack: () => void; readOnly?: boolean }) {
  const [view, setView] = useState<'list' | 'receive' | Row>('list');
  const [detailKey, setDetailKey] = useState<unknown>(undefined);
  const words = copy[lang.value] ?? el;
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
    const expiryDate = asDate(lot.expiry);
    if (f.expired && expiryDate !== undefined && isCalendarDate(today)) flags.push('stock.flag.expired');
    if (f.soon) flags.push('stock.flag.soon');
    const lines = own.map((m) => ({ id: m.id, at: text(m.created_at), line: t('stock.movement', { sign: m.direction === 'in' ? '+' : '−', qty: formatQty(text(m.qty_str)), reason: reasonText(m.reason) }) }));
    return {
      lot, flags, lines, expiryDate,
      title: text(lot.batch) ? t('stock.batch', { batch: text(lot.batch) }) : t('stock.noBatch'),
      expiry: expiryDate ? t('stock.expiry', { date: formatDateLong(expiryDate) }) : words.unknown,
      balance: t('stock.balance', { qty: qtyText(balance, unit) }),
    };
  });
  const detail = detailKey === undefined ? undefined : cards.find((c) => c.lot.lot_key === detailKey);
  if (detail) {
    const days = detail.expiryDate && isCalendarDate(today) ? (Date.parse(detail.expiryDate) - Date.parse(today)) / dayMs : undefined;
    const daysLeft = days !== undefined && days >= 0 ? words.days.replace('{n}', formatQty(days)) : undefined;
    return <section data-testid="lot-detail">
      <PageHead heading={detail.title} back={() => setDetailKey(undefined)} backText={t('info.back')} />
      <Card>
        <p>{detail.balance}</p>
        <p>{detail.expiry}</p>
        {daysLeft !== undefined && <p data-testid="lot-days-left">{daysLeft}</p>}
        {detail.flags.map((key) => <Chip key={key} tone={key === 'stock.flag.expired' ? 'blocked' : 'warn'}>{t(key)}</Chip>)}
      </Card>
      <h2>{words.moves}</h2>
      <p class="muted">{t('stock.note')}</p>
      <Card>{detail.lines.length ? detail.lines.map((move) => <ListRow key={move.id} testid="lot-detail-movement"
        heading={move.line} meta={move.at ? formatDateTime(move.at) : t('value.unknown')} />) : <p>{t('stock.empty')}</p>}</Card>
    </section>;
  }
  return (
    <section>
      <BackBar onBack={onBack} />
      <h1 tabIndex={-1}>{nameOf(product)}</h1>
      {lots.rows && <p class="card" data-testid="stock-total">{t('stock.total', { qty: qtyText(balanceOf(mine), unit) })}</p>}
      {!readOnly && <button class="btn" data-testid="receive-open" onClick={() => setView('receive')}>{t('stock.receive')}</button>}
      {lots.rows && list.length === 0 && <p class="muted" data-testid="stock-empty">{t('stock.empty')}</p>}
      <p class="muted">{t('stock.note')}</p>
      {cards.map((c) => (
        <div class="card" key={c.lot.id} data-testid="lot">{c.title}
          <small>{c.expiry}</small>
          <small data-testid="lot-balance">{c.balance}</small>
          {c.flags.map((k) => <span key={k} data-testid="lot-flag"><Chip tone={k === 'stock.flag.expired' ? 'blocked' : 'warn'}>{t(k)}</Chip></span>)}
          {c.lines.map((m) => <small key={m.id} data-testid="movement">{m.line}</small>)}
          {typeof c.lot.lot_key === 'string' && <ListRow heading={words.moves} testid="lot-detail-open" onClick={() => setDetailKey(c.lot.lot_key)} />}
          <UnsyncedMark id={c.lot.id} />
          {!readOnly && <button class="btn secondary" data-testid="adjust-open" onClick={() => setView(c.lot)}>{t('stock.adjust')}</button>}
        </div>
      ))}
    </section>
  );
}
