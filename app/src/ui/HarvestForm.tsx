import { parseWhole } from '@aloni/rules-core';
import { useEffect, useState } from 'preact/hooks';
import { dataVersion, db, activeFarm } from '../db';
import { formatDate, formatDateTime, t, tn, ts } from '../i18n';
import { formatArea } from '../i18n/format';
import { put } from '../repo';
import { saveDestination, type Destination } from '../stock/destination';
import { serverDestination } from '../stock/destination-words';
import { serverRecordsOn } from '../owner-records/mode';
import { buildHarvest, harvestGate, isPlanned } from '../spray/harvest';
import { athensInstant, athensLocalNow, instantOf } from '../spray/time';
import { useSubmit } from './useSubmit';
import { CropIcon } from './ds';
import type { Row } from '../db/schema';
import { nameOf } from './screens';
import { useRows } from './useRows';

const text = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * The harvest counter. The planting must have NO running or unknown waiting period at the time chosen: otherwise the screen says why and saving is
 * impossible. There is no override and no «unblock» button: only a known waiting period that has run out opens the harvest.
 */
/** Language-free symbols (see WorkerApp). */
const MARK = { lock: '🔒', ok: '✓' } as const;
const MAIN = new Set(['growing', 'harvesting']);
const MAX_CRATES = 9999;

export function HarvestForm({ onDone, farmId = activeFarm.value, actorId, big = false }: { onDone: (saved: boolean) => void; farmId?: string; actorId?: string; big?: boolean }) {
  const { busy, submit } = useSubmit();
  const labelRows = useRows('label_uses'); const plantings = useRows('plantings'); const crops = useRows('crops'); const parcels = useRows('parcels'); const links = useRows('job_plantings'); const sprays = useRows('job_spray'); const workers = useRows('workers');
  const roster = (workers.rows ?? []).filter((w) => !w.deleted_at);
  const [cutBy, setCutBy] = useState(actorId ?? '');       // a worker's own phone sends her roster entry; the owner picks
  const [planting, setPlanting] = useState('');
  const [crates, setCrates] = useState('');
  const [when, setWhen] = useState(athensLocalNow(new Date()) ?? '');
  const [note, setNote] = useState('');
  const [dest, setDest] = useState<Destination | undefined>(undefined);
  const [recvName, setRecvName] = useState(''); const [recvPhone, setRecvPhone] = useState('');
  const [failed, setFailed] = useState(0);        // how many times a save was refused: the first error is focused each time
  const [savedLine, setSavedLine] = useState('');
  const at = athensInstant(when) ?? '';
  const gate = planting ? harvestGate(planting, instantOf(new Date()) ?? '', links.rows ?? [], sprays.rows ?? [], plantings.rows ?? [], labelRows.rows ?? []) : undefined;
  const blocked = gate && !gate.ok ? gate : undefined;
  const live = plantings.rows?.filter((p) => !p.deleted_at) ?? [];
  const name = (p: Row) => t('spray.planting', { crop: nameOf(crops.rows?.find((c) => c.id === p.crop_id) ?? {}), parcel: text(parcels.rows?.find((x) => x.id === p.parcel_id)?.name) });
  const parcelOf = (p: Row): string => text(parcels.rows?.find((x) => x.id === p.parcel_id)?.name);
  const cratesN = parseWhole<'Crates'>(crates);
  const slugOf = (p: Row): string => text(crops.rows?.find((c) => c.id === p.crop_id)?.slug);
  const cropOf = (p: Row): string => nameOf(crops.rows?.find((c) => c.id === p.crop_id) ?? {});
  const sameIn = (p: Row, q: Row): boolean => q.parcel_id === p.parcel_id && cropOf(q) === cropOf(p);
  const dated = (p: Row): string => (p.sown_on ? formatDate(text(p.sown_on)) : '');
  /** Under a parcel heading a chip is the crop only; two plantings of one crop in one field add the sowing date, and the area when even that is equal. */
  const labelOf = (p: Row): string => {
    const twins = live.filter((q) => sameIn(p, q));
    if (twins.length < 2) return cropOf(p);
    const sameDate = twins.some((q) => q.id !== p.id && dated(q) === dated(p));
    return [cropOf(p), dated(p), sameDate && p.area_str !== undefined ? formatArea(p.area_str as string | number) : ''].filter(Boolean).join(' · ');
  };
  const markOf = (p: Row): string => {
    if (isPlanned(p)) return t('planting.status.planned');      // planned, not sown yet: nothing to cut
    const g = harvestGate(String(p.id), instantOf(new Date()) ?? '', links.rows ?? [], sprays.rows ?? [], plantings.rows ?? [], labelRows.rows ?? []);
    if (g.ok) return '';
    return g.reason === 'running' && g.until ? t('harvest.chip.until', { d: formatDateTime(g.until) }) : t('harvest.chip.unknown');
  };
  const chipText = (p: Row): string => [planting === p.id ? MARK.ok : '', markOf(p) ? MARK.lock : '', labelOf(p), markOf(p)].filter(Boolean).join(' ');
  const mainFirst = (a: Row, b: Row): number => Number(text(b.status) === 'harvesting') - Number(text(a.status) === 'harvesting');
  const main = live.filter((p) => MAIN.has(text(p.status))).sort(mainFirst);
  const others = live.filter((p) => !MAIN.has(text(p.status)));
  const chosen = live.find((p) => p.id === planting);
  const picker = (list: Row[]) => [...new Set(list.map((p) => text(p.parcel_id)))].map((pid) => (
    <div key={pid}>
      <h3>{text(parcels.rows?.find((x) => x.id === pid)?.name)}</h3>
      <div class="seg two">{list.filter((p) => text(p.parcel_id) === pid).map((p) => <button class="pick" key={p.id} data-testid="harvest-chip" disabled={isPlanned(p)} aria-pressed={planting === p.id} onClick={() => setPlanting(String(p.id))}><CropIcon slug={slugOf(p)} size="var(--icon-sm)" /><span>{chipText(p)}</span></button>)}</div>
    </div>
  ));
  const cratesError = failed > 0 ? (!cratesN.known ? t('harvest.error.crates') : cratesN.value < 1 ? t('harvest.error.zero') : cratesN.value > MAX_CRATES ? t('harvest.error.max', { max: MAX_CRATES }) : '') : '';
  useEffect(() => { if (failed > 0) document.querySelector<HTMLElement>('main [data-error]')?.focus(); }, [failed]);
  const step = (d: 1 | -1 | 5 | 10) => { const n = parseWhole<'Crates'>(crates); const cur = n.known ? n.value : 0; setCrates(cur + d < 1 ? '' : `${Math.min(cur + d, MAX_CRATES)}`); }; // the counter buttons: +1 / −1, never below 1
  const save = async () => {
    const r = buildHarvest({ plantingId: planting, crates, harvestedAt: at, note, cutBy }, links.rows ?? [], sprays.rows ?? [], farmId, new Date().toISOString(), crypto.randomUUID(), plantings.rows ?? [], labelRows.rows ?? []);
    if (!r.ok || (big && dest === undefined)) { setFailed((n) => n + 1); return; }
    const where = dest !== undefined && await serverRecordsOn(db) ? { destination: serverDestination(dest) } : {};   // the server column exists (0036) once the owner confirmed it; before that the answer stays on this phone
    await put(db, 'job_harvest', { ...r.row, ...(actorId ? { actor_id: actorId } : {}), ...where }, 'insert');
    if (dest !== undefined) await saveDestination(db, farmId, String(r.row.id), { d: dest, name: recvName, phone: recvPhone });
    dataVersion.value++;
    if (big) { setSavedLine(cratesN.known ? tn('harvest.saved.line', cratesN.value, { crop: chosen ? cropOf(chosen) : '' }) : ''); setPlanting(''); setCrates(''); setNote(''); setDest(undefined); setRecvName(''); setRecvPhone(''); setWhen(athensLocalNow(new Date()) ?? ''); setFailed(0); }
    onDone(true);
  };
  const shown = parseWhole<'Crates'>(crates).known ? crates.trim() : '0'; // the counter shows 0 until a number is chosen
  const reason = blocked ? (blocked.reason === 'unknown' ? ts('harvest.blocked.unknown') : blocked.reason === 'running' ? ts(blocked.by === 'rei' ? 'harvest.blocked.rei' : 'harvest.blocked.running', { d: formatDateTime(blocked.until ?? '') }) : ts('harvest.blocked.time')) : '';
  return (
    <section>
      <h1>{t('harvest.add')}</h1>
      <h2>{t('harvest.planting')}</h2>
      {savedLine && <p class="msg" role="status" data-testid="harvest-saved-line">{savedLine}</p>}
      {picker(main)}
      {others.length > 0 && <h2>{t('harvest.others')}</h2>}
      {picker(others)}
      {failed > 0 && !planting && <p class="msg error" role="alert" tabIndex={-1} data-error data-testid="harvest-planting-error">{t('harvest.error.planting')}</p>}
      {blocked && <p class="badge blocked bi" role="alert" data-testid="harvest-blocked"><span aria-hidden="true">{MARK.lock}</span> {reason}</p>}
      {chosen && <p class="caption" data-testid="harvest-chosen"><strong>{labelOf(chosen)}</strong><small>{parcelOf(chosen)}</small></p>}
      {big ? (
        <>
          <div class="counter">
            <button data-testid="harvest-less" aria-label={t('harvest.less')} onClick={() => step(-1)}>{t('harvest.minus')}</button>
            <output data-testid="harvest-count" aria-live="polite">{shown}</output>
            <button data-testid="harvest-more" aria-label={t('harvest.more')} onClick={() => step(1)}>{t('harvest.plus')}</button>
          </div>
          <div class="seg two jumps" data-testid="harvest-jumps">
            <button class="big" data-testid="harvest-more5" onClick={() => step(5)}>{t('harvest.more5')}</button>
            <button class="big" data-testid="harvest-more10" onClick={() => step(10)}>{t('harvest.more10')}</button>
          </div>
          <p class="caption muted">{t('harvest.counter')}</p>
        </>
      ) : (
        <>
          <label class="field">{t('harvest.crates')}
            <input class="input" value={crates} inputMode="numeric" autoComplete="off" data-testid="harvest-crates" onInput={(e) => setCrates((e.target as HTMLInputElement).value)} />
          </label>
          <div class="seg steps">
            <button onClick={() => step(-1)}>{t('harvest.less')}</button>
            <button data-testid="harvest-more" onClick={() => step(1)}>{t('harvest.more')}</button>
            <button data-testid="harvest-more5" onClick={() => step(5)}>{t('harvest.more5')}</button>
            <button data-testid="harvest-more10" onClick={() => step(10)}>{t('harvest.more10')}</button>
          </div>
        </>
      )}
      {actorId === undefined && (
        <>
          <h2>{t('harvest.cutby')}</h2>
          {roster.length === 0 && <p class="msg error" role="alert" data-testid="harvest-noroster">{t('harvest.cutby.none')}</p>}
          <div class="seg two" data-testid="harvest-cutby">{roster.map((w) => <button key={w.id} aria-pressed={cutBy === w.id} data-testid="harvest-cutby-option" onClick={() => setCutBy(w.id)}>{text(w.name)}</button>)}</div>
          {failed > 0 && cutBy === '' && <p class="msg error" role="alert" tabIndex={-1} data-error data-testid="harvest-cutby-error">{t('harvest.cutby.error')}</p>}
        </>
      )}
      <h2>{t('ui.dest.title')}</h2>
      <div class={big ? 'seg two big' : 'seg two'} role="group" aria-label={t('ui.dest.title')} data-testid="harvest-dest">
        <button aria-pressed={dest === 'store'} data-testid="harvest-dest-store" onClick={() => setDest('store')}>{t('ui.dest.store')}</button>
        <button aria-pressed={dest === 'dispatch'} data-testid="harvest-dest-dispatch" onClick={() => setDest('dispatch')}>{t('ui.dest.dispatch')}</button>
      </div>
      {big && failed > 0 && dest === undefined && <p class="msg error" role="alert" tabIndex={-1} data-error data-testid="harvest-dest-error">{t('ui.dest.error')}</p>}
      {dest === 'dispatch' && (
        <>
          <label class="field">{t('ui.dest.recv.name')}<input class="input" value={recvName} autoComplete="off" data-testid="harvest-recv-name" onInput={(e) => setRecvName((e.target as HTMLInputElement).value)} /></label>
          <label class="field">{t('ui.dest.recv.phone')}<input class="input" type="tel" value={recvPhone} autoComplete="off" data-testid="harvest-recv-phone" onInput={(e) => setRecvPhone((e.target as HTMLInputElement).value)} /></label>
          <p class="muted">{t('ui.dest.recv.note')}</p>
        </>
      )}
      {cratesError && <p class="msg error" role="alert" tabIndex={-1} data-error data-testid="harvest-crates-error">{cratesError}</p>}
      <label class="field">{t('harvest.time')}
        <input class="input" type="datetime-local" value={when} onInput={(e) => setWhen((e.target as HTMLInputElement).value)} />
      </label>
      <label class="field">{t('harvest.note')}
        <input class="input" value={note} autoComplete="off" onInput={(e) => setNote((e.target as HTMLInputElement).value)} />
      </label>
      <button class={big ? 'btn big' : 'btn'} data-testid="harvest-save" disabled={busy || blocked !== undefined} onClick={() => void submit(save)}>{t('harvest.save')}</button>
      <button class={big ? 'btn secondary big' : 'btn secondary'} data-testid="harvest-cancel" onClick={() => onDone(false)}>{t('product.cancel')}</button>
    </section>
  );
}

/** The harvests recorded so far, newest first. */
export function Harvests() {
  const rows = useRows('job_harvest'); const plantings = useRows('plantings'); const crops = useRows('crops'); const parcels = useRows('parcels');
  const list = [...(rows.rows ?? [])].sort((a, b) => text(b.harvested_at).localeCompare(text(a.harvested_at)));
  const people = useRows('workers');
  const cards = list.map((h) => {
    const p = plantings.rows?.find((x) => x.id === h.planting_id);
    const n = parseWhole<'Crates'>(text(h.crates_str));
    return { h, title: t('spray.planting', { crop: nameOf(crops.rows?.find((c) => c.id === p?.crop_id) ?? {}), parcel: text(parcels.rows?.find((x) => x.id === p?.parcel_id)?.name) }), count: n.known ? tn('harvest.count', n.value) : t('value.unknown'), when: formatDateTime(text(h.harvested_at)), who: t('harvest.cutby.line', { name: text(people.rows?.find((w) => w.id === h.cut_by)?.name) || t('value.unknown') }) };
  });
  return (
    <>
      <h2>{t('harvest.title')}</h2>
      {rows.rows && cards.length === 0 && <p class="muted">{t('harvest.empty')}</p>}
      {cards.map((c) => <div class="card" key={c.h.id} data-testid="harvest">{c.title}<small>{c.count}</small><small>{c.when}</small><small data-testid="harvest-who">{c.who}</small></div>)}
    </>
  );
}
