import { parseWhole } from '@aloni/rules-core';
import { useState } from 'preact/hooks';
import { dataVersion, db, realFarmId } from '../db';
import { formatDateTime, t, tn } from '../i18n';
import { put } from '../repo';
import { buildHarvest, harvestGate } from '../spray/harvest';
import { athensInstant, athensLocalNow, instantOf } from '../spray/time';
import type { Row } from '../db/schema';
import { nameOf } from './screens';
import { useRows } from './useRows';

const text = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * The harvest counter. The planting must have NO running or unknown waiting period at the time chosen: otherwise the screen says why and saving is
 * impossible. There is no override and no «unblock» button: only a known waiting period that has run out opens the harvest.
 */
export function HarvestForm({ onDone, farmId = realFarmId.value, actorId, big = false }: { onDone: (saved: boolean) => void; farmId?: string; actorId?: string; big?: boolean }) {
  const plantings = useRows('plantings'); const crops = useRows('crops'); const parcels = useRows('parcels'); const links = useRows('job_plantings'); const sprays = useRows('job_spray');
  const [planting, setPlanting] = useState('');
  const [crates, setCrates] = useState('');
  const [when, setWhen] = useState(athensLocalNow(new Date()) ?? '');
  const [note, setNote] = useState('');
  const [failed, setFailed] = useState(false);
  const at = athensInstant(when) ?? '';
  const gate = planting ? harvestGate(planting, instantOf(new Date()) ?? '', links.rows ?? [], sprays.rows ?? []) : undefined;
  const blocked = gate && !gate.ok ? gate : undefined;
  const live = plantings.rows?.filter((p) => !p.deleted_at) ?? [];
  const name = (p: Row) => t('spray.planting', { crop: nameOf(crops.rows?.find((c) => c.id === p.crop_id) ?? {}), parcel: text(parcels.rows?.find((x) => x.id === p.parcel_id)?.name) });
  const step = (d: 1 | -1) => { const n = parseWhole<'Crates'>(crates); const cur = n.known ? n.value : 0; setCrates(cur + d < 1 ? '' : `${cur + d}`); }; // the counter buttons: +1 / −1, never below 1
  const save = async () => {
    const r = buildHarvest({ plantingId: planting, crates, harvestedAt: at, note }, links.rows ?? [], sprays.rows ?? [], farmId, new Date().toISOString(), crypto.randomUUID());
    if (!r.ok) { setFailed(true); return; }
    await put(db, 'job_harvest', actorId ? { ...r.row, actor_id: actorId } : r.row, 'insert');
    dataVersion.value++;
    onDone(true);
  };
  const reason = blocked ? (blocked.reason === 'unknown' ? t('harvest.blocked.unknown') : blocked.reason === 'running' ? t('harvest.blocked.running', { d: formatDateTime(blocked.until ?? '') }) : t('harvest.blocked.time')) : '';
  return (
    <section>
      <h1>{t('harvest.add')}</h1>
      <h2>{t('harvest.planting')}</h2>
      <div class="seg two">{live.map((p) => <button key={p.id} aria-pressed={planting === p.id} onClick={() => setPlanting(p.id)}>{name(p)}</button>)}</div>
      {blocked && <p class="badge blocked" role="alert" data-testid="harvest-blocked">{reason}</p>}
      <label class="field">{t('harvest.crates')}
        <input class="input" value={crates} inputMode="numeric" autoComplete="off" data-testid="harvest-crates" onInput={(e) => setCrates((e.target as HTMLInputElement).value)} />
      </label>
      <div class={big ? 'seg two big' : 'seg two'}>
        <button onClick={() => step(-1)}>{t('harvest.less')}</button>
        <button data-testid="harvest-more" onClick={() => step(1)}>{t('harvest.more')}</button>
      </div>
      {failed && !parseWhole<'Crates'>(crates).known && <p class="msg error" role="alert">{t('harvest.error.crates')}</p>}
      <label class="field">{t('harvest.time')}
        <input class="input" type="datetime-local" value={when} onInput={(e) => setWhen((e.target as HTMLInputElement).value)} />
      </label>
      <label class="field">{t('harvest.note')}
        <input class="input" value={note} autoComplete="off" onInput={(e) => setNote((e.target as HTMLInputElement).value)} />
      </label>
      <button class={big ? 'btn big' : 'btn'} data-testid="harvest-save" disabled={blocked !== undefined} onClick={() => void save()}>{t('harvest.save')}</button>
      <button class="btn secondary" onClick={() => onDone(false)}>{t('product.cancel')}</button>
    </section>
  );
}

/** The harvests recorded so far, newest first. */
export function Harvests() {
  const rows = useRows('job_harvest'); const plantings = useRows('plantings'); const crops = useRows('crops'); const parcels = useRows('parcels');
  const list = [...(rows.rows ?? [])].sort((a, b) => text(b.harvested_at).localeCompare(text(a.harvested_at)));
  const cards = list.map((h) => {
    const p = plantings.rows?.find((x) => x.id === h.planting_id);
    const n = parseWhole<'Crates'>(text(h.crates_str));
    return { h, title: t('spray.planting', { crop: nameOf(crops.rows?.find((c) => c.id === p?.crop_id) ?? {}), parcel: text(parcels.rows?.find((x) => x.id === p?.parcel_id)?.name) }), count: n.known ? tn('harvest.count', n.value) : t('value.unknown'), when: formatDateTime(text(h.harvested_at)) };
  });
  return (
    <>
      <h2>{t('harvest.title')}</h2>
      {rows.rows && cards.length === 0 && <p class="muted">{t('harvest.empty')}</p>}
      {cards.map((c) => <div class="card" key={c.h.id} data-testid="harvest">{c.title}<small>{c.count}</small><small>{c.when}</small></div>)}
    </>
  );
}
