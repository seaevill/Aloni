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

import { weekCratesByClient } from '../../src/orders/customers';
describe('weekCratesByClient: crates per client in the Monday–Sunday week of a day', () => {
  const orders: KlouvesOrders = { products: [{ id: 'p', name: 'x' }], weeks: {}, skipped: 0, clients: [{ id: 'c1', name: 'A' }, { id: 'own:u', name: 'B' }],
    days: { '2026-11-23': { c1: { p: 2.5 }, 'own:u': { p: 4 } }, '2026-11-25': { c1: { p: 1 } }, '2026-11-30': { c1: { p: 9 } }, '2026-11-22': { c1: { p: 7 } } } };
  it('adds the days of that week only, quarters kept exactly', () => {
    const w = weekCratesByClient(orders, '2026-11-24');
    expect(w.get('c1')).toBe(3.5);
    expect(w.get('own:u')).toBe(4);
  });
  it('a client with no order that week is absent (not 0)', () => {
    expect(weekCratesByClient(orders, '2026-12-08').size).toBe(0);
    expect(weekCratesByClient(undefined, '2026-11-24').size).toBe(0);
  });
});
