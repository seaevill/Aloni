import type { AppDB } from '../db/schema';
import { put, putLocal } from '../repo';
import { buildCustomer, buildCustomerOrder, buildWorkerCard } from './records';
import { mondayOf, type KlouvesOrders } from '../orders/klouves';
import { mapKey, ordersKey } from '../orders/store';

// The one-time move of what the owner typed on THIS phone (customers, own orders, worker cards) into the server tables, once 0037 is confirmed. Idempotent: a marker per farm, and every row keeps the id it had.
// The own entries are taken out of the local order file afterwards (the screens read the server rows), so nothing is counted twice. The Κλούβες import part of that file is left untouched.
const MARK = (farm: string): string => `owner_records_moved:${farm}`;
interface LocalCustomer { id: string; name: string; phone: string; note: string }

export async function moveLocalOwnerRecords(db: AppDB, farm: string, now = new Date().toISOString()): Promise<boolean> {
  if ((await db.settings.get(MARK(farm))) !== undefined) return false;
  const customers = ((await db.settings.get(`customers:${farm}`))?.value as LocalCustomer[] | undefined) ?? [];
  for (const c of customers) { const r = buildCustomer({ name: c.name, phone: c.phone, note: c.note }, farm, now, c.id); if (r.ok) { await put(db, 'customers', r.row, 'insert');  } }
  const orders = (await db.settings.get(ordersKey(farm)))?.value as KlouvesOrders | undefined;
  const map = ((await db.settings.get(mapKey(farm)))?.value as Record<string, string> | undefined) ?? {};
  const crops = await db.crops.where('farm_id').equals(farm).toArray();
  if (orders?.days) {
    for (const [day, byClient] of Object.entries(orders.days)) {
      for (const [client, items] of Object.entries(byClient)) {
        if (!client.startsWith('own:')) continue;
        for (const [product, qty] of Object.entries(items)) {
          const slug = map[product] ?? '';
          const crop = crops.find((c) => c.slug === slug);
          const r = crop ? buildCustomerOrder({ customerId: client.slice(4), cropId: String(crop.id), crates: String(qty), day }, farm, now, crypto.randomUUID()) : undefined;
          if (r?.ok) { await put(db, 'customer_orders', r.row, 'insert');  }
        }
      }
    }
    const days: NonNullable<KlouvesOrders['days']> = {};
    for (const [day, byClient] of Object.entries(orders.days)) { const keep = Object.fromEntries(Object.entries(byClient).filter(([c]) => !c.startsWith('own:'))); if (Object.keys(keep).length > 0) days[day] = keep; }
    const weeks = weeksOf(days);            // the week totals are rebuilt from what is left (own entries gone)
    await putLocal(db, ordersKey(farm), { ...orders, days, weeks, clients: (orders.clients ?? []).filter((c) => !c.id.startsWith('own:')), products: orders.products.filter((p) => !p.id.startsWith('own-crop:')) });
  }
  const workers = await db.workers.where('farm_id').equals(farm).toArray();
  for (const w of workers) {
    const card = (await db.settings.get(`worker_card:${farm}:${String(w.id)}`))?.value as { surname?: string; phone?: string } | undefined;
    if (!card || ((card.surname ?? '') === '' && (card.phone ?? '') === '')) continue;
    const r = buildWorkerCard({ workerId: String(w.id), surname: card.surname, phone: card.phone }, farm, now, crypto.randomUUID());
    if (r.ok) { await put(db, 'worker_cards', r.row, 'insert');  }
  }
  await putLocal(db, MARK(farm), now);
  return true;
}
function weeksOf(days: NonNullable<KlouvesOrders['days']>): KlouvesOrders['weeks'] {
  const weeks: Record<string, Record<string, number>> = {};
  for (const [day, byClient] of Object.entries(days)) {
    const monday = mondayOf(day);
    if (monday === undefined) continue;
    const week: Record<string, number> = weeks[monday] ?? {};
    for (const items of Object.values(byClient)) for (const [p, q] of Object.entries(items)) { const before = week[p]; if (before === undefined) week[p] = q; else week[p] = before + q; }
    weeks[monday] = week;
  }
  return weeks;
}
