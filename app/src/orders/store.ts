import type { AppDB } from '../db/schema';
import { delLocal, putLocal } from '../repo';
import type { KlouvesOrders } from './klouves';
import { athensDayOf, nextDay } from './tomorrow';

// The Κλούβες import and the crop map belong to ONE farm (T5, 2026-11-19, safety rule 4): a real client list never shows up in the demo and a demo sample never in the real farm.
const ORDERS = 'klouves_orders'; const MAP = 'klouves_cropmap';
export const ordersKey = (farmId: string): string => `${ORDERS}:${farmId}`;
export const mapKey = (farmId: string): string => `${MAP}:${farmId}`;

export async function loadOrders(db: AppDB, farmId: string): Promise<{ orders: KlouvesOrders | undefined; map: Record<string, string> }> {
  const o = (await db.settings.get(ordersKey(farmId)))?.value as KlouvesOrders | undefined;
  const m = (await db.settings.get(mapKey(farmId)))?.value as Record<string, string> | undefined;
  return { orders: o, map: m ?? {} };
}
export async function saveOrders(db: AppDB, farmId: string, orders: KlouvesOrders, map: Record<string, string>): Promise<void> { await putLocal(db, ordersKey(farmId), orders); await putLocal(db, mapKey(farmId), map); }
export async function saveMap(db: AppDB, farmId: string, map: Record<string, string>): Promise<void> { await putLocal(db, mapKey(farmId), map); }

/** An import made before this change sat under one unkeyed key: it belongs to the REAL farm (never to the demo). */
export async function migrateUnkeyedOrders(db: AppDB, realFarmId: string): Promise<void> {
  for (const [old, keyed] of [[ORDERS, ordersKey(realFarmId)], [MAP, mapKey(realFarmId)]] as const) {
    const v = (await db.settings.get(old))?.value;
    if (v === undefined) continue;
    if ((await db.settings.get(keyed)) === undefined) await putLocal(db, keyed, v);
    await delLocal(db, old);
  }
}

const DAY_MS = 86_400_000;
const iso = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
const monday = (ms: number): string => { const d = new Date(ms); return iso(ms - ((d.getUTCDay() + 6) % 7) * DAY_MS); };
/** A small FICTIONAL order list for the demo farm (made-up quantities, no client names): the days around today (summed per week). */
export function demoOrders(todayMs: number): { orders: KlouvesOrders; map: Record<string, string> } {
  const products = [{ id: 'd-sp', name: 'Σπανάκι' }, { id: 'd-ro', name: 'Ρόκα' }, { id: 'd-pa', name: 'Μαϊντανός' }];
  const weeks: Record<string, Record<string, number>> = {};
  for (let i = -3; i <= 3; i += 1) {
    const ms = todayMs + i * DAY_MS; const d = { 'd-sp': 12, 'd-ro': 6.5, 'd-pa': 4 };
    const w = (weeks[monday(ms)] ??= {});
    for (const [k, q] of Object.entries(d)) { const before = w[k]; if (before === undefined) w[k] = q; else w[k] = before + q; }
  }
  // fictional per-day orders for tomorrow (the Athens day after today), so «Αύριο φεύγουν» can be tried in the demo; made-up clients and quantities
  const today = athensDayOf(new Date(todayMs).toISOString()) ?? iso(todayMs);
  const days = { [nextDay(today)]: { 'd-c1': { 'd-sp': 8, 'd-ro': 2.5 }, 'd-c2': { 'd-sp': 4, 'd-pa': 4 } } };
  const clients = [{ id: 'd-c1', name: 'Πελάτης Α' }, { id: 'd-c2', name: 'Πελάτης Β' }];
  return { orders: { products, weeks, skipped: 0, days, clients }, map: { 'd-sp': 'spinach', 'd-ro': 'rocket', 'd-pa': 'parsley' } };
}
