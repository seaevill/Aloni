import { useState } from 'preact/hooks';
import { activeFarm, dataVersion, db, realFarmId } from '../db';
import { formatDateLong, t } from '../i18n';
import { formatQty } from '../i18n/format';
import { archived, restored } from '../parcels/parcel';
import { isCalendarDate } from '@aloni/rules-core';
import { signedUseOf } from '../labels/label-use';
import { balanceOf } from '../stock/stock';
import { put } from '../repo';
import type { Row } from '../db/schema';
import { MediaThumb } from './Photos';
import { LabelUses } from './LabelUses';
import { StockLots } from './StockLots';
import { ProductForm, TYPE_KEYS } from './ProductForm';
import { nameOf, Status, Title } from './screens';
import { UnsyncedMark } from './states';
import { showUndo } from './Toast';
import { useRows } from './useRows';

const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const dot = (...xs: string[]): string => xs.filter(Boolean).join(' · ');
const typeText = (v: unknown): string => { const k = (TYPE_KEYS as Record<string, (typeof TYPE_KEYS)[keyof typeof TYPE_KEYS]>)[text(v)]; return k ? t(k) : ''; };

const stockText = (product: Row, moves: Row[]): string => { const b = balanceOf(moves.filter((m) => m.product_id === product.id)); return b === undefined ? t('value.unknown') : `${formatQty(b)} ${text(product.unit)}`; };

/** Αποθήκη: the farm's products (sprays and fertilisers). Quantities and lots come with the stock PR. */
export function Stock() {
  const demo = activeFarm.value !== realFarmId.value;
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<Row | undefined>(undefined);
  const [lots, setLots] = useState<Row | undefined>(undefined);
  const q = useRows('products');
  const moves = useRows('stock_movements');
  const lotRows = useRows('stock_lots'); const labelRows = useRows('label_uses'); const cropRows = useRows('crops');
  const [filter, setFilter] = useState<string>('');
  if (adding) return <ProductForm onDone={() => setAdding(false)} />;
  if (lots) return <StockLots product={lots} readOnly={demo} onBack={() => setLots(undefined)} />;
  if (open) return <LabelUses product={open} readOnly={demo} onBack={() => setOpen(undefined)} />;
  const live = q.rows?.filter((r) => !r.deleted_at) ?? [];
  const types = [...new Set(live.map((r) => text(r.type)).filter((x) => x !== ''))];
  const shown = filter === '' ? live : live.filter((r) => text(r.type) === filter);
  /** The nearest expiry among the product's lots (a real date only). */
  const expiryOf = (id: unknown): string | undefined => (lotRows.rows ?? []).filter((l) => l.product_id === id && isCalendarDate(text(l.expiry))).map((l) => text(l.expiry)).sort()[0];
  /** The waiting period per crop, ONLY from label uses with a signed, complete, unchanged entry (never a default, never an unsigned value). */
  const phiLine = (id: unknown): string => (labelRows.rows ?? []).filter((l) => l.product_id === id && !l.deleted_at).flatMap((l) => {
    const sg = signedUseOf(l); const crop = cropRows.rows?.find((c) => c.id === l.crop_id);
    return sg.known && crop ? [t('stock.phi.item', { crop: nameOf(crop), n: formatQty(sg.value.phiDays) })] : [];
  }).join(' · ');
  const archive = async (r: Row) => {
    await put(db, 'products', archived(r, new Date().toISOString()));
    dataVersion.value++;
    showUndo(t('product.archived'), async () => { await put(db, 'products', restored(r, new Date().toISOString())); dataVersion.value++; });
  };
  return (
    <section>
      <header class="today-head band"><Title k="stock.title" /></header>
      {demo ? <p class="muted" data-testid="product-demo-note">{t('product.demoActive')}</p> : live.length > 0 && <button class="btn" data-testid="product-add" onClick={() => setAdding(true)}>{t('product.add')}</button>}
      <Status q={{ ...q, rows: q.rows && live.length === 0 ? [] : q.rows }} message={t('list.empty')} action={demo ? undefined : { label: t('product.add'), run: () => setAdding(true) }} />
      {types.length > 1 && (
        <div class="filters" data-testid="stock-filters" role="group" aria-label={t('stock.filter')}>
          <button class="tag-btn" aria-pressed={filter === ''} data-testid="stock-filter-all" onClick={() => setFilter('')}>{t('stock.filter.all', { n: formatQty(live.length) })}</button>
          {types.map((k) => <button key={k} class="tag-btn" aria-pressed={filter === k} data-testid={`stock-filter-${k}`} onClick={() => setFilter(k)}>{typeText(k)}</button>)}
        </div>
      )}
      {shown.map((r) => {
        const exp = expiryOf(r.id); const phi = phiLine(r.id);
        return (
          <div class="card product-card" key={r.id} data-testid="product"><strong>{nameOf(r)}</strong>
            <div class="tags">{typeText(r.type) && <span class="tag">{typeText(r.type)}</span>}{text(r.reg_no) && <span class="tag">{text(r.reg_no)}</span>}</div>
            <small>{dot(r.qty == null ? '' : `${formatQty(r.qty as number | string)} ${text(r.unit)}`)}</small>
            {moves.rows && <small data-testid="product-stock">{t('stock.balance', { qty: stockText(r, moves.rows) })}</small>}
            {exp && <small data-testid="product-expiry">{t('stock.expiry', { date: formatDateLong(exp) })}</small>}
            {phi && <small data-testid="product-phi">{t('stock.phi', { list: phi })}</small>}
            {text(r.label_photo_id) && <div class="photos"><MediaThumb id={text(r.label_photo_id)} /></div>}
            <UnsyncedMark id={r.id} />
            <div class="actions2">
              <button class="row" data-testid="stock-open" onClick={() => setLots(r)}><span>{t('stock.open')}</span><span aria-hidden="true" class="chev" /></button>
              <button class="row" data-testid="labeluse-open" onClick={() => setOpen(r)}><span>{t('labeluse.open')}</span><span aria-hidden="true" class="chev" /></button>
            </div>
            {!demo && <button class="btn quiet" onClick={() => void archive(r)}>{t('product.archive')}</button>}
          </div>
        );
      })}
    </section>
  );
}
