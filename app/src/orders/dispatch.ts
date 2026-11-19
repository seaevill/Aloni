import type { KlouvesOrders } from './klouves';

// «Αποστολή»: what goes out on one day, per client (from the Κλούβες backup, read by hand). Display and a text to copy for the driver.
// It carries NO spray, waiting-period or label information: held crops are shown on screen only.

const FRACTION = ['', '¼', '½', '¾'] as const;

/** Crates in quarters as the farmer writes them: 4.5 → «4½», 0.25 → «¼», 6 → «6». A value that is not a multiple of ¼ (it is skipped at import) prints as its plain number. Quarters are exact in binary, so nothing is rounded. */
export function fractionText(q: number): string {
  if (!Number.isFinite(q) || q < 0) return '';
  const quarters = q * 4;
  if (!Number.isInteger(quarters)) return String(q);
  const rest = quarters % 4;
  const whole = (quarters - rest) / 4;
  if (rest === 0) return String(whole);
  return whole === 0 ? FRACTION[rest] : `${whole}${FRACTION[rest]}`;
}

export interface DispatchItem { productId: string; name: string; qty: number; slug: string | undefined }
export interface DispatchClient { clientId: string; name: string; items: DispatchItem[]; total: number }

/** The clients of one day, A–Z, each with their products; a client or product without a name in the backup is shown by its id (never dropped). */
export function dispatchDay(orders: KlouvesOrders | undefined, map: Readonly<Record<string, string>>, date: string): DispatchClient[] {
  const day = orders?.days?.[date];
  if (!orders || !day) return [];
  const cname = (id: string): string => orders.clients?.find((c) => c.id === id)?.name ?? id;
  const pname = (id: string): string => orders.products.find((p) => p.id === id)?.name ?? id;
  const out: DispatchClient[] = [];
  for (const [clientId, items] of Object.entries(day)) {
    const list = Object.entries(items).filter(([, q]) => q > 0).map(([productId, qty]) => ({ productId, name: pname(productId), qty, slug: map[productId] }));
    if (list.length === 0) continue;
    out.push({ clientId, name: cname(clientId), items: list, total: list.reduce((a, i) => a + i.qty, 0) });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, 'el'));
}

export interface DispatchLabels { header: string; total: (qty: string, n: number) => string }
/** The text for the driver: one line per client, then the total. */
export function dispatchText(clients: readonly DispatchClient[], labels: DispatchLabels): string {
  const lines = clients.map((c) => `${c.name}: ${c.items.map((i) => `${i.name} ${fractionText(i.qty)}`).join(' · ')}`);
  const all = clients.reduce((a, c) => a + c.total, 0);
  return [labels.header, ...lines, labels.total(fractionText(all), all)].join('\n');
}

/** Share sheet first, then the clipboard, then «select it yourself». */
export async function copyText(text: string, nav: { share?: (d: { text: string }) => Promise<void>; clipboard?: { writeText: (s: string) => Promise<void> } }): Promise<'shared' | 'copied' | 'manual' | 'cancelled'> {
  try { if (nav.share) { await nav.share({ text }); return 'shared'; } } catch (e) { if (e instanceof Error && e.name === 'AbortError') return 'cancelled'; /* refused: try the next way */ }
  try { if (nav.clipboard) { await nav.clipboard.writeText(text); return 'copied'; } } catch { /* fall through */ }
  return 'manual';
}
