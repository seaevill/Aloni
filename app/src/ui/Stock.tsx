import { useState } from 'preact/hooks';
import { activeFarm, dataVersion, db, realFarmId } from '../db';
import { t } from '../i18n';
import { formatQty } from '../i18n/format';
import { archived, restored } from '../parcels/parcel';
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
  if (adding) return <ProductForm onDone={() => setAdding(false)} />;
  if (lots) return <StockLots product={lots} readOnly={demo} onBack={() => setLots(undefined)} />;
  if (open) return <LabelUses product={open} readOnly={demo} onBack={() => setOpen(undefined)} />;
  const live = q.rows?.filter((r) => !r.deleted_at) ?? [];
  const archive = async (r: Row) => {
    await put(db, 'products', archived(r, new Date().toISOString()));
    dataVersion.value++;
    showUndo(t('product.archived'), async () => { await put(db, 'products', restored(r, new Date().toISOString())); dataVersion.value++; });
  };
  return (
    <section>
      <Title k="stock.title" />
      {demo ? <p class="muted" data-testid="product-demo-note">{t('product.demoActive')}</p> : live.length > 0 && <button class="btn" data-testid="product-add" onClick={() => setAdding(true)}>{t('product.add')}</button>}
      <Status q={{ ...q, rows: q.rows && live.length === 0 ? [] : q.rows }} message={t('list.empty')} action={demo ? undefined : { label: t('product.add'), run: () => setAdding(true) }} />
      {live.map((r) => (
        <div class="card" key={r.id} data-testid="product">{nameOf(r)}
          <small>{dot(typeText(r.type), text(r.reg_no), r.qty == null ? '' : `${formatQty(r.qty as number | string)} ${text(r.unit)}`)}</small>
          {moves.rows && <small data-testid="product-stock">{t('stock.balance', { qty: stockText(r, moves.rows) })}</small>}
          {text(r.label_photo_id) && <div class="photos"><MediaThumb id={text(r.label_photo_id)} /></div>}
          <UnsyncedMark id={r.id} />
          <button class="row" data-testid="stock-open" onClick={() => setLots(r)}><span>{t('stock.open')}</span><span aria-hidden="true" class="chev" /></button>
          <button class="row" data-testid="labeluse-open" onClick={() => setOpen(r)}><span>{t('labeluse.open')}</span><span aria-hidden="true" class="chev" /></button>
          {!demo && <button class="btn secondary" onClick={() => void archive(r)}>{t('product.archive')}</button>}
        </div>
      ))}
    </section>
  );
}
