import { parseWhole } from '@aloni/rules-core';
import type { KlouvesOrders } from './klouves';
import { mondayOf } from './klouves';

// Orders the owner types himself («Νέα παραγγελία»: customer × crop × crates × day). They go into the SAME shape as the Κλούβες import (client, product, day line, week total) with ids that cannot clash with an import (`own:` / `own-crop:`),
// so «Αύριο φεύγουν» and the supply table read them without a second code path. Whole crates only; an unreadable number or a day that does not exist is refused, never guessed. Stored on this phone, per farm (the server table comes with 0037).
export interface CustomerOrderInput { customerId: string; customerName: string; slug: string; cropName: string; day: string; crates: string }
export type AddOrderResult = { ok: true; orders: KlouvesOrders; map: Record<string, string> } | { ok: false; reason: 'crates' | 'day' };

export const clientIdOf = (customerId: string): string => `own:${customerId}`;
export const productIdOf = (slug: string): string => `own-crop:${slug}`;

function bump(rec: Record<string, number>, key: string, add: number): void {
  const before = rec[key];
  if (before === undefined) rec[key] = add; else rec[key] = before + add;
}

export function addCustomerOrder(orders: KlouvesOrders, map: Record<string, string>, input: CustomerOrderInput): AddOrderResult {
  const n = parseWhole<'Crates'>(input.crates.trim());
  if (!n.known || n.value <= 0) return { ok: false, reason: 'crates' };
  const monday = mondayOf(input.day);
  if (monday === undefined) return { ok: false, reason: 'day' };
  const client = clientIdOf(input.customerId); const product = productIdOf(input.slug);
  const clients = (orders.clients ?? []).some((c) => c.id === client) ? [...(orders.clients ?? [])] : [...(orders.clients ?? []), { id: client, name: input.customerName }];
  const products = orders.products.some((p) => p.id === product) ? [...orders.products] : [...orders.products, { id: product, name: input.cropName }];
  const days = { ...(orders.days ?? {}) };
  const day = { ...(days[input.day] ?? {}) };
  const line: Record<string, number> = { ...(day[client] ?? {}) };
  bump(line, product, n.value);
  day[client] = line; days[input.day] = day;
  const weeks: Record<string, Record<string, number>> = { ...orders.weeks };
  const prev = weeks[monday];
  const week: Record<string, number> = {};
  if (prev !== undefined) Object.assign(week, prev);
  weeks[monday] = week;
  bump(week, product, n.value);
  return { ok: true, orders: { ...orders, products, clients, days, weeks }, map: { ...map, [product]: input.slug } };
}

/** Crates ordered per client in the Monday–Sunday week of `day` (quarters kept exactly). A client with nothing that week is absent from the map: the screen says «—», never 0. */
export function weekCratesByClient(orders: KlouvesOrders | undefined, day: string): Map<string, number> {
  const sums: Record<string, number> = {};
  const monday = mondayOf(day);
  if (orders?.days === undefined || monday === undefined) return new Map();
  const start = Date.parse(`${monday}T12:00:00Z`);
  for (const [d, byClient] of Object.entries(orders.days)) {
    const ms = Date.parse(`${d}T12:00:00Z`);
    if (!(ms >= start && ms < start + 7 * 86_400_000)) continue;
    for (const [client, items] of Object.entries(byClient)) for (const q of Object.values(items)) bump(sums, client, q);
  }
  return new Map(Object.entries(sums));
}
