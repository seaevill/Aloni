import { useSubmit } from './useSubmit';
import { useEffect, useState } from 'preact/hooks';
import { activeFarm, dataVersion, db } from '../db';
import { formatDate, t } from '../i18n';
import { loadOrders, saveOrders } from '../orders/store';
import { addCustomerOrder, clientIdOf, weekCratesByClient } from '../orders/customers';
import { fractionText } from '../orders/dispatch';
import { nextDay } from '../orders/tomorrow';
import { athensToday } from '../plantings/planting';
import { CATALOG } from '../crops/catalog';
import { put, putLocal } from '../repo';
import { serverRecordsOn } from '../owner-records/mode';
import { buildCustomer, buildCustomerOrder } from '../owner-records/records';
import { useRows } from './useRows';
import type { KlouvesOrders } from '../orders/klouves';
import { BackBar } from './BackBar';
import { Card, ListRow } from './ds';

// Άλλα → Πελάτες: the owner's customers (name, phone, note) and the orders he types for them. Everything stays on this phone, per farm; only the owner opens this screen. The orders go into the same shape the Κλούβες import
// uses, so «Αύριο φεύγουν» and the supply table read them.
interface Customer { id: string; name: string; phone: string; note: string }
const key = (farm: string): string => `customers:${farm}`;
const EMPTY: KlouvesOrders = { products: [], weeks: {}, skipped: 0, days: {}, clients: [] };

async function loadCustomers(farm: string, server: boolean): Promise<Customer[]> {
  if (server) return (await db.customers.where('farm_id').equals(farm).toArray()).filter((c) => !c.deleted_at).map((c) => ({ id: String(c.id), name: String(c.name), phone: String(c.phone ?? ''), note: String(c.note ?? '') }));
  return ((await db.settings.get(key(farm)))?.value as Customer[] | undefined) ?? [];
}

export function Customers({ onBack }: { onBack: () => void }) {
  const farm = activeFarm.value;
  const [list, setList] = useState<Customer[] | undefined>(undefined);
  const [orders, setOrders] = useState<KlouvesOrders>(EMPTY);
  const [map, setMap] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [server, setServer] = useState(false);
  const crops = useRows('crops');
  const [open, setOpen] = useState<string | undefined>(undefined);
  const reload = async () => { const on = await serverRecordsOn(db); setServer(on); const o = await loadOrders(db, farm); setOrders(o.orders ?? EMPTY); setMap(o.map); setList(await loadCustomers(farm, on)); };      // loadOrders first: it moves the local records to the server tables once, when the owner confirmed 0037
  useEffect(() => { void reload(); }, [farm]);
  const week = weekCratesByClient(orders, athensToday(new Date()) ?? '');
  const weekLine = (client: string): string => { const n = week.get(client); return n === undefined ? t('ui.cust.week.none') : t('ui.cust.week', { n: fractionText(n) }); };
  const imported = (orders.clients ?? []).filter((c) => !c.id.startsWith('own:'));
  const shown = (list ?? []).find((c) => c.id === open);
  if (shown) return <CustomerPage customer={shown} orders={orders} map={map} onBack={() => setOpen(undefined)} server={server} cropRows={crops.rows ?? []} farm={farm} onSaved={async (o, m) => { if (!server) await saveOrders(db, farm, o, m); dataVersion.value++; await reload(); }} />;
  if (adding) return <NewCustomer onBack={() => setAdding(false)} onSave={async (c) => { if (server) { const r = buildCustomer({ name: c.name, phone: c.phone, note: c.note }, farm, new Date().toISOString(), c.id); if (r.ok) await put(db, 'customers', r.row, 'insert'); dataVersion.value++; } else await putLocal(db, key(farm), [...(list ?? []), c]); await reload(); setAdding(false); }} />;
  return (
    <section data-testid="customers">
      <BackBar onBack={onBack} testId="customers-back" />
      <h1 tabIndex={-1}>{t('ui.cust.title')}</h1>
      {list !== undefined && list.length === 0 && imported.length === 0 && <p class="muted" data-testid="customers-none">{t('ui.cust.none')}</p>}
      {(list ?? []).map((c) => <ListRow key={c.id} testid="customer" heading={c.name} meta={[c.phone === '' ? t('ui.cust.phone.none') : c.phone, weekLine(clientIdOf(c.id))].join(' · ')} onClick={() => setOpen(c.id)} />)}
      {imported.map((c) => <ListRow key={c.id} testid="customer-imported" heading={c.name} meta={[t('ui.cust.imported'), weekLine(c.id)].join(' · ')} />)}
      <button class="btn" data-testid="customer-add" onClick={() => setAdding(true)}>{t('ui.cust.add')}</button>
      {!server && <p class="muted">{t('ui.cust.local')}</p>}
    </section>
  );
}

function NewCustomer({ onBack, onSave }: { onBack: () => void; onSave: (c: Customer) => Promise<void> }) {
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [note, setNote] = useState(''); const [bad, setBad] = useState(false);
  const { busy, submit: guard } = useSubmit();
  const submit = async () => { if (name.trim() === '') { setBad(true); return; } await onSave({ id: crypto.randomUUID(), name: name.trim(), phone: phone.trim(), note: note.trim() }); };
  return (
    <section data-testid="customer-new">
      <BackBar onBack={onBack} testId="customer-new-back" />
      <h1 tabIndex={-1}>{t('ui.cust.add')}</h1>
      <label class="field">{t('ui.cust.name')}<input class="input" value={name} autoComplete="off" data-testid="customer-name" onInput={(e) => setName((e.target as HTMLInputElement).value)} /></label>
      {bad && <p class="msg error" role="alert" data-testid="customer-name-error">{t('ui.cust.err.name')}</p>}
      <label class="field">{t('ui.cust.phone')}<input class="input" type="tel" value={phone} autoComplete="off" data-testid="customer-phone" onInput={(e) => setPhone((e.target as HTMLInputElement).value)} /></label>
      <label class="field">{t('ui.cust.note')}<input class="input" value={note} autoComplete="off" data-testid="customer-note" onInput={(e) => setNote((e.target as HTMLInputElement).value)} /></label>
      <button class="btn" data-testid="customer-save" disabled={busy} onClick={() => void guard(submit)}>{t('ui.cust.save')}</button>
    </section>
  );
}

function CustomerPage({ customer, orders, map, onBack, onSaved, server, cropRows, farm }: { customer: Customer; orders: KlouvesOrders; map: Record<string, string>; onBack: () => void; onSaved: (o: KlouvesOrders, m: Record<string, string>) => Promise<void>; server: boolean; cropRows: readonly import('../db/schema').Row[]; farm: string }) {
  const today = athensToday(new Date()) ?? '';
  const [slug, setSlug] = useState(''); const [crates, setCrates] = useState(''); const [day, setDay] = useState(nextDay(today));
  const [err, setErr] = useState<'crates' | 'day' | 'crop' | undefined>(undefined); const [saved, setSaved] = useState(false);
  const cid = clientIdOf(customer.id);
  const cropName = (s: string): string => CATALOG.find((c) => c.slug === s)?.el ?? s;
  const mine = Object.entries(orders.days ?? {}).flatMap(([d, byClient]) => Object.entries(byClient[cid] ?? {}).map(([product, n]) => ({ d, slug: map[product] ?? '', n }))).filter((x) => x.slug !== '').sort((a, b) => b.d.localeCompare(a.d));
  const { busy, submit: guard } = useSubmit();
  const submit = async () => {
    setSaved(false);
    if (slug === '') { setErr('crop'); return; }
    if (server) {                                                  // the order is a SERVER row (synced between phones); the screens read it back through loadOrders
      const crop = cropRows.find((c) => c.slug === slug);
      const built = crop ? buildCustomerOrder({ customerId: customer.id, cropId: String(crop.id), crates, day }, farm, new Date().toISOString(), crypto.randomUUID()) : undefined;
      if (!built?.ok) { setErr(built === undefined ? 'crop' : built.reason === 'day' ? 'day' : 'crates'); return; }
      await put(db, 'customer_orders', built.row, 'insert');
      setErr(undefined); await onSaved(orders, map); setCrates(''); setSaved(true); return;
    }
    const r = addCustomerOrder(orders, map, { customerId: customer.id, customerName: customer.name, slug, cropName: cropName(slug), day, crates });
    if (!r.ok) { setErr(r.reason); return; }
    setErr(undefined); await onSaved(r.orders, r.map); setCrates(''); setSaved(true);
  };
  return (
    <section data-testid="customer-page">
      <BackBar onBack={onBack} testId="customer-back" />
      <h1 tabIndex={-1}>{customer.name}</h1>
      <Card>
        <p data-testid="customer-phone-line">{customer.phone === '' ? t('ui.cust.phone.none') : customer.phone}</p>
        {customer.note !== '' && <p>{customer.note}</p>}
      </Card>
      <h2>{t('ui.cust.orders')}</h2>
      {mine.length === 0 && <p class="muted" data-testid="customer-orders-none">{t('ui.cust.orders.none')}</p>}
      {mine.map((o) => <div class="card" key={`${o.d}-${o.slug}`} data-testid="customer-order">{t('ui.cust.line', { day: formatDate(o.d), crop: cropName(o.slug), n: o.n })}</div>)}
      <h2>{t('ui.cust.neworder')}</h2>
      <div class="seg two" role="group" aria-label={t('ui.cust.crop')}>
        {CATALOG.filter((c) => !server || cropRows.some((r) => r.slug === c.slug && !r.deleted_at)).map((c) => <button key={c.slug} aria-pressed={slug === c.slug} data-testid={`order-crop-${c.slug}`} onClick={() => setSlug(c.slug)}>{c.el}</button>)}
      </div>
      <label class="field">{t('ui.cust.crates')}<input class="input" inputMode="numeric" value={crates} autoComplete="off" data-testid="order-crates" onInput={(e) => setCrates((e.target as HTMLInputElement).value)} /></label>
      <label class="field">{t('ui.cust.day')}<input class="input" type="date" value={day} data-testid="order-day" onInput={(e) => setDay((e.target as HTMLInputElement).value)} /></label>
      {err === 'crates' && <p class="msg error" role="alert" data-testid="order-error">{t('ui.cust.err.crates')}</p>}
      {err === 'day' && <p class="msg error" role="alert" data-testid="order-error">{t('ui.cust.err.day')}</p>}
      {saved && <p class="msg" role="status" data-testid="order-saved">{t('ui.cust.saved')}</p>}
      <button class="btn" data-testid="order-save" disabled={busy} onClick={() => void guard(submit)}>{t('ui.cust.save')}</button>
    </section>
  );
}
