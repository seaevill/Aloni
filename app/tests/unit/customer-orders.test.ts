import { describe, expect, it } from 'vitest';
import { addCustomerOrder, type CustomerOrderInput } from '../../src/orders/customers';
import type { KlouvesOrders } from '../../src/orders/klouves';

const empty: KlouvesOrders = { products: [], weeks: {}, skipped: 0, days: {}, clients: [] };
const base: CustomerOrderInput = { customerId: 'cu1', customerName: 'Μαρία', slug: 'parsley', cropName: 'Μαϊντανός', day: '2026-11-23', crates: '12' };

describe('addCustomerOrder: an own order goes into the same shape the Κλούβες import uses (so «Αύριο φεύγουν» reads it)', () => {
  it('adds the client, a product mapped to the crop, the day line and the week total', () => {
    const r = addCustomerOrder(empty, {}, base);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.orders.clients).toEqual([{ id: 'own:cu1', name: 'Μαρία' }]);
    expect(r.orders.products).toEqual([{ id: 'own-crop:parsley', name: 'Μαϊντανός' }]);
    expect(r.map).toEqual({ 'own-crop:parsley': 'parsley' });
    expect(r.orders.days?.['2026-11-23']?.['own:cu1']).toEqual({ 'own-crop:parsley': 12 });
    expect(r.orders.weeks['2026-11-23']).toEqual({ 'own-crop:parsley': 12 });
  });
  it('adds to an existing line of the same customer, crop and day (never overwrites)', () => {
    const first = addCustomerOrder(empty, {}, base);
    if (!first.ok) throw new Error('x');
    const second = addCustomerOrder(first.orders, first.map, { ...base, crates: '3' });
    if (!second.ok) throw new Error('x');
    expect(second.orders.days?.['2026-11-23']?.['own:cu1']?.['own-crop:parsley']).toBe(15);
    expect(second.orders.weeks['2026-11-23']?.['own-crop:parsley']).toBe(15);
    expect(second.orders.clients).toHaveLength(1);
  });
  it('refuses an unreadable or zero crate number and a day that does not exist (nothing guessed)', () => {
    for (const bad of [{ crates: '' }, { crates: '0' }, { crates: 'x' }, { crates: '2,5' }, { day: '2026-02-30' }, { day: '' }]) {
      expect(addCustomerOrder(empty, {}, { ...base, ...bad }).ok).toBe(false);
    }
  });
});
