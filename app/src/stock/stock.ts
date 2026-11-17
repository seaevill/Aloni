import { compareDecimal, dateAfterDays, isCalendarDate, parseDecimal, type Decimal, type Known } from '@aloni/rules-core';
import type { Row } from '../db/schema';
import { signOf, sumSigned } from './balance';

// Stock is a LEDGER. A lot is a receipt (batch + expiry); every change of quantity is a movement row (in / out, a quantity, a reason). Rows are
// only ever added: a mistake is corrected by a new row that points at the old one (`amends_id`), never by editing or deleting.

export type Direction = 'in' | 'out';
type Problem = 'missing' | 'invalid' | undefined;
const qtyProblem = (s: string): { problem: Problem; value: Decimal | undefined } => {
  const q = parseDecimal(s);
  if (!q.known) return { problem: q.reason === 'missing' ? 'missing' : 'invalid', value: undefined };
  return compareDecimal(q.value, '0' as Decimal) > 0 ? { problem: undefined, value: q.value } : { problem: 'invalid', value: undefined };
};

export interface ReceiptInput { productId: string; batch: string; expiry: string; qty: string; photoId: string | undefined }
export type ReceiptResult = { ok: true; lot: Row; movement: Row } | { ok: false; product: boolean; expiry: boolean; qty: Problem };

/** Receiving stock: a product, a real expiry date (with its year) and a quantity above zero. The batch number and the prescription photo are optional. */
export function buildReceipt(input: ReceiptInput, farmId: string, nowIso: string, ids: { lot: string; movement: string }): ReceiptResult {
  const qty = qtyProblem(input.qty);
  const bad = { product: !input.productId, expiry: !isCalendarDate(input.expiry), qty: qty.problem };
  if (bad.product || bad.expiry || !qty.value) return { ok: false, ...bad };
  const batch = input.batch.trim();
  const lot: Row = { id: ids.lot, lot_key: ids.lot, farm_id: farmId, product_id: input.productId, expiry: input.expiry, created_at: nowIso, ...(batch ? { batch } : {}), ...(input.photoId ? { photo_id: input.photoId } : {}) };
  const movement: Row = { id: ids.movement, farm_id: farmId, lot_key: ids.lot, product_id: input.productId, direction: 'in', qty_str: qty.value, reason: 'receipt', created_at: nowIso };
  return { ok: true, lot, movement };
}

export interface AdjustInput { lotKey: string; productId: string; direction: Direction | undefined; qty: string; reason: string; amendsId: string | undefined }
export type AdjustResult = { ok: true; movement: Row } | { ok: false; direction: boolean; qty: Problem; reason: boolean };

/** Adjusting a lot: the direction is chosen (nothing preselected), the quantity is above zero and a reason is written. A correction names the movement it amends. */
export function buildAdjustment(input: AdjustInput, farmId: string, nowIso: string, id: string): AdjustResult {
  const qty = qtyProblem(input.qty);
  const reason = input.reason.trim();
  if (!input.direction || !qty.value || !reason) return { ok: false, direction: !input.direction, qty: qty.problem, reason: !reason };
  return { ok: true, movement: { id, farm_id: farmId, lot_key: input.lotKey, product_id: input.productId, direction: input.direction, qty_str: qty.value, reason, created_at: nowIso, ...(input.amendsId ? { amends_id: input.amendsId } : {}) } };
}

/** Balance of any set of movements, exact: in minus out. Unreadable rows are never skipped silently: they make the balance «unknown» (undefined). */
export function balanceOf(movements: readonly Row[]): string | undefined {
  const items: Array<{ qty: string; sign: 1 | -1 }> = [];
  for (const m of movements) {
    const q = typeof m.qty_str === 'string' ? parseDecimal(m.qty_str) : undefined;
    if (!q?.known || (m.direction !== 'in' && m.direction !== 'out')) return undefined;
    items.push({ qty: q.value, sign: m.direction === 'in' ? 1 : -1 });
  }
  return sumSigned(items);
}

/** A lot corrected by an amending row: the newest row of each `lot_key` is the one in force. */
export function effectiveLots(lots: readonly Row[]): Row[] {
  const newest = new Map<string, Row>();
  for (const l of lots) {
    const key = String(l.lot_key);
    const seen = newest.get(key);
    if (!seen || String(l.created_at) > String(seen.created_at)) newest.set(key, l);
  }
  return [...newest.values()];
}

export interface Flags { negative: boolean; unknown: boolean; expired: boolean; soon: boolean }
/** Flags for one lot as of `today` (a real `YYYY-MM-DD`); `soonDays` is the farmer's setting («expires soon» is information only). A negative or unreadable balance is flagged, never hidden; an unreadable date is never «fine». */
export function flagsOf(lot: Row, balance: string | undefined, today: string, soonDays: Known<number>): Flags {
  const expiry = typeof lot.expiry === 'string' && isCalendarDate(lot.expiry) ? lot.expiry : undefined;
  const limit = soonDays.known ? dateAfterDays(today, soonDays.value) : soonDays; // no usable setting = no «soon» flag
  const expired = expiry === undefined || !isCalendarDate(today) || expiry < today; // no readable date counts as expired: nobody should rely on it
  return {
    negative: balance !== undefined && signOf(balance) === -1,
    unknown: balance === undefined,
    expired,
    soon: !expired && limit.known && expiry !== undefined && expiry <= limit.value,
  };
}
