import { useEffect, useState } from 'preact/hooks';
import { activeFarm, dataVersion, db } from '../db';
import { loadOrders, saveMap, saveOrders } from '../orders/store';
import { CATALOG, cropName } from '../crops/catalog';
import { lang, t, tn } from '../i18n';
import { formatQty } from '../i18n/format';
import { cratesByCrop, mondayOf, parseBackup, suggestCropMap, type KlouvesOrders } from '../orders/klouves';
import { sowHint, supplyByCrop, type SowHint } from '../orders/available';
import { copyText, dispatchDay, dispatchText, fractionText } from '../orders/dispatch';
import { athensToday } from '../plantings/planting';
import { BackBar } from './BackBar';
import { useRows } from './useRows';

const SOW_TEXT: Record<SowHint, () => string> = { ready: () => '', held: () => t('orders.sow.held'), none: () => t('orders.sow.none') };
const DAY = 86_400_000;
/** For the plural word only: one crate or less reads «κλούβα», anything above it «κλούβες» (1½ κλούβες, ½ κλούβα). */
const oneOrMore = (n: number): number => (n <= 1 ? 1 : 2);
const DAY_LABEL = new Intl.DateTimeFormat('el-GR', { weekday: 'long', day: 'numeric', month: 'numeric', timeZone: 'Europe/Athens' });
const shiftDay = (iso: string, d: number): string => new Date(Date.parse(`${iso}T12:00:00Z`) + d * DAY).toISOString().slice(0, 10);
const dayLabel = (iso: string): string => DAY_LABEL.format(new Date(`${iso}T12:00:00Z`));
const COPY_NOTE = { shared: '', copied: 'dispatch.copied', manual: 'dispatch.manual', cancelled: '' } as const;

/** More → «Διαθέσιμες κλούβες»: the Κλούβες backup (read by hand, one way), what is ordered per crop, and what can be cut now. Waiting-period-held plantings never count as supply. */
export function Orders({ onBack }: { onBack: () => void }) {
  const [orders, setOrders] = useState<KlouvesOrders | undefined>(undefined);
  const [map, setMap] = useState<Record<string, string>>({});
  const [bad, setBad] = useState(false); const [note, setNote] = useState(0);
  const crops = useRows('crops'); const plantings = useRows('plantings'); const links = useRows('job_plantings'); const sprays = useRows('job_spray'); const harvests = useRows('job_harvest'); const labels = useRows('label_uses');
  const [offset, setOffset] = useState(0); const [copied, setCopied] = useState<keyof typeof COPY_NOTE | ''>('');
  const crops = useRows('crops'); const plantings = useRows('plantings'); const links = useRows('job_plantings'); const sprays = useRows('job_spray'); const harvests = useRows('job_harvest');
  const farm = activeFarm.value;
  useEffect(() => {
    let live = true;
    void loadOrders(db, farm).then((r) => { if (live) { setOrders(r.orders); setMap(r.map); } });      // this farm's own import only
    return () => { live = false; };
  }, [farm, dataVersion.value]);
  const load = async (file: File | undefined) => {
    if (!file) return;
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) { setBad(true); return; }
    if (activeFarm.value !== farm) return;      // the farm was switched while the file was read: nothing is shown or saved under the wrong farm
    const next = { ...suggestCropMap(parsed.orders.products), ...map };
    setBad(false); setOrders(parsed.orders); setMap(next); setNote(parsed.orders.skipped);
    await saveOrders(db, farm, parsed.orders, next); dataVersion.value++;
  };
  const choose = async (productId: string, slug: string) => {
    const next = { ...map }; if (slug) next[productId] = slug; else delete next[productId];
    setMap(next); await saveMap(db, farm, next);
  };
  const today = athensToday(new Date()) ?? '';
  const thisWeek = mondayOf(today);
  const lastWeek = thisWeek === undefined ? undefined : mondayOf(new Date(Date.parse(`${thisWeek}T00:00:00Z`) - DAY).toISOString().slice(0, 10));
  const now = cratesByCrop(thisWeek === undefined ? undefined : orders?.weeks[thisWeek], map);
  const before = cratesByCrop(lastWeek === undefined ? undefined : orders?.weeks[lastWeek], map);
  const supply = supplyByCrop(new Date().toISOString(), crops.rows ?? [], plantings.rows ?? [], links.rows ?? [], sprays.rows ?? [], harvests.rows ?? [], labels.rows ?? []);
  const slugs = CATALOG.filter((c) => now.bySlug[c.slug] !== undefined || before.bySlug[c.slug] !== undefined);
  const date = shiftDay(today, offset);
  const clients = dispatchDay(orders, map, date);
  const dispatchTxt = dispatchText(clients, { header: t('dispatch.header', { day: dayLabel(date) }), total: (q, n) => tn('dispatch.total', oneOrMore(n), { q }) });
  const copy = async () => setCopied(await copyText(dispatchTxt, { share: typeof navigator.share === 'function' ? (d) => navigator.share(d) : undefined, clipboard: navigator.clipboard }));
  const heldSlug = (slug: string | undefined): boolean => { const s = slug === undefined ? undefined : supply[slug]; return s !== undefined && s.free === 0 && s.held + s.unknown > 0; }; // nothing free but something held or unknown: shown in red, never counted as supply
  const unmapped = new Set([...now.unmapped, ...before.unmapped]).size;
  return (
    <section data-testid="orders">
      <BackBar onBack={onBack} />
      <h1 tabIndex={-1}>{t('orders.title')}</h1>
      <p class="muted">{t('orders.note')}</p>
      <label class="btn secondary">{t('orders.import')}<input type="file" accept=".json,application/json" hidden data-testid="orders-file" onChange={(e) => void load((e.target as HTMLInputElement).files?.[0])} /></label>
      {bad && <p class="msg error" role="alert" data-testid="orders-bad">{t('orders.bad')}</p>}
      {note > 0 && <p class="muted" role="status" data-testid="orders-skipped">{t('orders.skipped', { n: formatQty(note) })}</p>}
      {orders && !orders.days && <p class="muted" data-testid="dispatch-reimport">{t('dispatch.reimport')}</p>}
      {orders?.days && (
        <section data-testid="dispatch">
          <h2>{t('dispatch.title')}</h2>
          <div class="seg" data-testid="dispatch-days">
            <button aria-label={t('dispatch.prev')} data-testid="dispatch-prev" onClick={() => { setOffset(offset - 1); setCopied(''); }}>{t('dispatch.prev.mark')}</button>
            <button aria-pressed={offset === 0} data-testid="dispatch-today" onClick={() => { setOffset(0); setCopied(''); }}>{t('dispatch.today')}</button>
            <button aria-pressed={offset === 1} data-testid="dispatch-tomorrow" onClick={() => { setOffset(1); setCopied(''); }}>{t('dispatch.tomorrow')}</button>
            <button aria-label={t('dispatch.next')} data-testid="dispatch-next" onClick={() => { setOffset(offset + 1); setCopied(''); }}>{t('dispatch.next.mark')}</button>
          </div>
          <p class="muted" data-testid="dispatch-date">{dayLabel(date)}</p>
          {clients.length === 0 && <p class="muted" data-testid="dispatch-none">{t('dispatch.none')}</p>}
          {clients.map((c) => (
            <div class="card" key={c.clientId} data-testid="dispatch-client">
              <strong>{c.name}</strong>
              {c.items.map((i) => (
                <small key={i.productId} data-testid="dispatch-item">{t('dispatch.line', { name: i.name, qty: fractionText(i.qty) })}{i.slug === undefined && <span class="badge unsigned">{t('dispatch.unmapped')}</span>}{heldSlug(i.slug) && <span class="badge blocked" data-testid="dispatch-held">{t('dispatch.held')}</span>}</small>
              ))}
              <small data-testid="dispatch-client-total">{tn('dispatch.total', oneOrMore(c.total), { q: fractionText(c.total) })}</small>
            </div>
          ))}
          {clients.length > 0 && <button class="btn" data-testid="dispatch-copy" onClick={() => void copy()}>{t('dispatch.copy')}</button>}
          {copied !== '' && COPY_NOTE[copied] !== '' && <p class="msg" role="status" data-testid="dispatch-copied">{t(COPY_NOTE[copied])}</p>}
          {copied === 'manual' && <textarea class="input" readOnly rows={6} value={dispatchTxt} data-testid="dispatch-text" onFocus={(e) => (e.target as HTMLTextAreaElement).select()} />}
        </section>
      )}
      {!orders && <p class="muted" data-testid="orders-empty">{t('orders.empty')}</p>}
      {orders && slugs.length === 0 && <p class="muted" data-testid="orders-none">{t('orders.none')}</p>}
      {slugs.map((c) => {
        const s = supply[c.slug];
        const hint = sowHint(s);
        return (
          <section class="card" key={c.slug} data-testid={`orders-${c.slug}`}>
            <strong>{cropName(c, lang.value)}</strong>
            <p data-testid={`orders-${c.slug}-week`}>{t('orders.line.week', { a: formatQty(now.bySlug[c.slug] ?? ''), b: formatQty(before.bySlug[c.slug] ?? '') })}</p>
            <p data-testid={`orders-${c.slug}-free`}>{t('orders.line.free', { n: formatQty(s?.free ?? ''), c: formatQty(s?.cut7 ?? '') })}</p>
            {s && s.held + s.unknown > 0 && <p class="muted" data-testid={`orders-${c.slug}-held`}>{t('orders.held', { n: formatQty(s.held + s.unknown) })}</p>}
            {hint !== 'ready' && <p class="msg" role="status" data-testid={`orders-${c.slug}-sow`}>{SOW_TEXT[hint]()}</p>}
          </section>
        );
      })}
      {slugs.length > 0 && <p class="muted">{t('orders.sow.note')}</p>}
      {unmapped > 0 && <p class="muted" data-testid="orders-unmapped">{t('orders.unmapped', { n: formatQty(unmapped) })}</p>}
      {orders && (
        <details class="card" data-testid="orders-map">
          <summary>{t('orders.map.toggle', { n: orders.products.length })}</summary>
          {orders.products.map((p) => (
            <label class="field" key={p.id}>{p.name}
              <select class="input" value={map[p.id] ?? ''} data-testid={`orders-map-${p.id}`} onChange={(e) => void choose(p.id, (e.target as HTMLSelectElement).value)}>
                <option value="">{t('orders.map.none')}</option>
                {CATALOG.map((c) => <option key={c.slug} value={c.slug}>{cropName(c, lang.value)}</option>)}
              </select>
            </label>
          ))}
        </details>
      )}
    </section>
  );
}
