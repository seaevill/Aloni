import { useRef, useState } from 'preact/hooks';
import { dataVersion, db, realFarmId } from '../db';
import { t } from '../i18n';
import { storePhoto } from '../media/photo';
import { put } from '../repo';
import { buildAdjustment, buildReceipt, type Direction } from '../stock/stock';
import type { Row } from '../db/schema';
import { MediaThumb } from './Photos';

const qtyKey = 'stock.error.qty';

/** Receive stock: a lot (batch optional, expiry WITH year, nothing preselected) and its first movement. */
export function ReceiveForm({ product, onDone }: { product: Row; onDone: () => void }) {
  const [batch, setBatch] = useState('');
  const [expiry, setExpiry] = useState('');
  const [qty, setQty] = useState('');
  const [photoId, setPhotoId] = useState<string | undefined>(undefined);
  const [bad, setBad] = useState({ expiry: false, qty: false });
  const file = useRef<HTMLInputElement>(null);
  const pick = async (e: Event) => {
    const el = e.target as HTMLInputElement;
    const f = el.files?.[0];
    el.value = '';
    if (f) setPhotoId((await storePhoto(db, realFarmId.value, f, new Date().toISOString())).id);
  };
  const save = async () => {
    const r = buildReceipt({ productId: product.id, batch, expiry, qty, photoId }, realFarmId.value, new Date().toISOString(), { lot: crypto.randomUUID(), movement: crypto.randomUUID() });
    if (!r.ok) { setBad({ expiry: r.expiry, qty: r.qty !== undefined }); return; }
    await put(db, 'stock_lots', r.lot, 'insert');
    await put(db, 'stock_movements', r.movement, 'insert');
    dataVersion.value++;
    onDone();
  };
  return (
    <section>
      <h1>{t('stock.receive')}</h1>
      <label class="field">{t('stock.field.batch')}
        <input class="input" value={batch} autoComplete="off" onInput={(e) => setBatch((e.target as HTMLInputElement).value)} />
      </label>
      <label class="field">{t('stock.field.expiry')}
        <input class="input" type="date" value={expiry} onInput={(e) => setExpiry((e.target as HTMLInputElement).value)} />
      </label>
      {bad.expiry && <p class="msg error" role="alert">{t('stock.error.expiry')}</p>}
      <label class="field">{t('stock.field.qty')}
        <input class="input" value={qty} inputMode="decimal" autoComplete="off" onInput={(e) => setQty((e.target as HTMLInputElement).value)} />
      </label>
      {bad.qty && <p class="msg error" role="alert">{t(qtyKey)}</p>}
      <input ref={file} type="file" accept="image/*" hidden aria-hidden="true" tabIndex={-1} onChange={(e) => void pick(e)} />
      <button class="btn secondary" onClick={() => file.current?.click()}>{t('stock.field.photo')}</button>
      {photoId && <div class="photos"><MediaThumb id={photoId} /></div>}
      <button class="btn" data-testid="receive-save" onClick={() => void save()}>{t('product.save')}</button>
      <button class="btn secondary" onClick={onDone}>{t('product.cancel')}</button>
    </section>
  );
}

/** Adjust a lot: increase or decrease (chosen), a quantity, a reason. It adds a movement; nothing is edited or deleted. */
export function AdjustForm({ lot, onDone }: { lot: Row; onDone: () => void }) {
  const [direction, setDirection] = useState<Direction | undefined>(undefined);
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [bad, setBad] = useState({ direction: false, qty: false, reason: false });
  const save = async () => {
    const r = buildAdjustment({ lotKey: String(lot.lot_key), productId: String(lot.product_id), direction, qty, reason, amendsId: undefined }, realFarmId.value, new Date().toISOString(), crypto.randomUUID());
    if (!r.ok) { setBad({ direction: r.direction, qty: r.qty !== undefined, reason: r.reason }); return; }
    await put(db, 'stock_movements', r.movement, 'insert');
    dataVersion.value++;
    onDone();
  };
  return (
    <section>
      <h1>{t('stock.adjust')}</h1>
      <h2>{t('stock.dir.title')}</h2>
      <div class="seg two">
        <button aria-pressed={direction === 'in'} onClick={() => setDirection('in')}>{t('stock.dir.in')}</button>
        <button aria-pressed={direction === 'out'} onClick={() => setDirection('out')}>{t('stock.dir.out')}</button>
      </div>
      {bad.direction && <p class="msg error" role="alert">{t('stock.error.direction')}</p>}
      <label class="field">{t('stock.field.qty')}
        <input class="input" value={qty} inputMode="decimal" autoComplete="off" onInput={(e) => setQty((e.target as HTMLInputElement).value)} />
      </label>
      {bad.qty && <p class="msg error" role="alert">{t(qtyKey)}</p>}
      <label class="field">{t('stock.field.reason')}
        <input class="input" value={reason} autoComplete="off" onInput={(e) => setReason((e.target as HTMLInputElement).value)} />
      </label>
      {bad.reason && <p class="msg error" role="alert">{t('stock.error.reason')}</p>}
      <button class="btn" data-testid="adjust-save" onClick={() => void save()}>{t('product.save')}</button>
      <button class="btn secondary" onClick={onDone}>{t('product.cancel')}</button>
    </section>
  );
}
