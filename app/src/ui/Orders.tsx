import { useEffect, useState } from 'preact/hooks';
import { activeFarm, dataVersion, db } from '../db';
import { loadOrders, saveMap, saveOrders } from '../orders/store';
import { CATALOG, cropName } from '../crops/catalog';
import { lang, t } from '../i18n';
import { formatQty } from '../i18n/format';
import { cratesByCrop, mondayOf, parseBackup, suggestCropMap, type KlouvesOrders } from '../orders/klouves';
import { sowHint, supplyByCrop, type SowHint } from '../orders/available';
import { athensToday } from '../plantings/planting';
import { BackBar } from './BackBar';
import { useRows } from './useRows';

const SOW_TEXT: Record<SowHint, () => string> = { ready: () => '', held: () => t('orders.sow.held'), none: () => t('orders.sow.none') };
const DAY = 86_400_000;

/** More → «Διαθέσιμες κλούβες»: the Κλούβες backup (read by hand, one way), what is ordered per crop, and what can be cut now. Waiting-period-held plantings never count as supply. */
export function Orders({ onBack }: { onBack: () => void }) {
  const [orders, setOrders] = useState<KlouvesOrders | undefined>(undefined);
  const [map, setMap] = useState<Record<string, string>>({});
  const [bad, setBad] = useState(false); const [note, setNote] = useState(0);
  const crops = useRows('crops'); const plantings = useRows('plantings'); const links = useRows('job_plantings'); const sprays = useRows('job_spray'); const harvests = useRows('job_harvest'); const labels = useRows('label_uses');
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
  const unmapped = new Set([...now.unmapped, ...before.unmapped]).size;
  return (
    <section data-testid="orders">
      <BackBar onBack={onBack} />
      <h1 tabIndex={-1}>{t('orders.title')}</h1>
      <p class="muted">{t('orders.note')}</p>
      <label class="btn secondary">{t('orders.import')}<input type="file" accept=".json,application/json" hidden data-testid="orders-file" onChange={(e) => void load((e.target as HTMLInputElement).files?.[0])} /></label>
      {bad && <p class="msg error" role="alert" data-testid="orders-bad">{t('orders.bad')}</p>}
      {note > 0 && <p class="muted" role="status" data-testid="orders-skipped">{t('orders.skipped', { n: formatQty(note) })}</p>}
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
        <section class="card" data-testid="orders-map">
          <strong>{t('orders.map.title')}</strong>
          {orders.products.map((p) => (
            <label class="field" key={p.id}>{p.name}
              <select class="input" value={map[p.id] ?? ''} data-testid={`orders-map-${p.id}`} onChange={(e) => void choose(p.id, (e.target as HTMLSelectElement).value)}>
                <option value="">{t('orders.map.none')}</option>
                {CATALOG.map((c) => <option key={c.slug} value={c.slug}>{cropName(c, lang.value)}</option>)}
              </select>
            </label>
          ))}
        </section>
      )}
    </section>
  );
}
