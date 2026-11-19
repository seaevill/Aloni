import { useState } from 'preact/hooks';
import { known } from '@aloni/rules-core';
import { dataVersion, db, realFarmId } from '../db';
import { t } from '../i18n';
import { formatDose } from '../i18n/format';
import { DOSE_UNITS, readUse, statusOf } from '../labels/label-use';
import { athensToday } from '../plantings/planting';
import { putMany } from '../repo';
import { buildJob } from '../spray/plan';
import { useSubmit } from './useSubmit';
import type { Row } from '../db/schema';
import { FLAG_KEYS } from './SprayForm';
import { Lines, badgeText } from './LabelUses';
import { UNIT_KEYS } from './LabelUseForm';
import { nameOf } from './screens';
import { useRows } from './useRows';

/** The owner plans a spray for a worker: plantings, product (and its label use), dose, unit, worker, day. Saved as a PLANNED job the worker sees; the worker cannot change any of it. */
export function JobForm({ onDone }: { onDone: (saved: boolean) => void }) {
  const { busy, submit } = useSubmit();
  const plantings = useRows('plantings'); const crops = useRows('crops'); const parcels = useRows('parcels'); const products = useRows('products'); const labels = useRows('label_uses'); const workers = useRows('workers');
  const live = (q: { rows: Row[] | null }) => q.rows?.filter((r) => !r.deleted_at) ?? [];
  const [sel, setSel] = useState<string[]>([]); const [productId, setProductId] = useState(''); const [workerId, setWorkerId] = useState('');
  const [dose, setDose] = useState(''); const [unit, setUnit] = useState<(typeof DOSE_UNITS)[number] | undefined>(undefined);
  const [day, setDay] = useState(athensToday(new Date()) ?? ''); const [failed, setFailed] = useState(false);
  const chosen = live(plantings).filter((p) => sel.includes(p.id));
  const label = productId && chosen.length ? live(labels).find((l) => l.product_id === productId && l.crop_id === chosen[0]?.crop_id) : undefined;
  const r = buildJob({ plantingIds: sel, productId, workerId, dose, doseUnit: unit, plannedFor: day }, { label, plantings: chosen }, realFarmId.value, new Date().toISOString(), { job: crypto.randomUUID(), plantingLinks: sel.map(() => crypto.randomUUID()) });
  const plantingName = (p: Row) => t('spray.planting', { crop: nameOf(crops.rows?.find((c) => c.id === p.crop_id) ?? {}), parcel: String(parcels.rows?.find((x) => x.id === p.parcel_id)?.name ?? '') });
  const offer = (_l: Row | undefined) => undefined;   // nothing is filled in for the owner (T6)
  const lu = label ? readUse(label) : undefined;
  const labelDose = lu && lu.dose.known ? { min: formatDose(known(lu.dose.value.min)), max: formatDose(known(lu.dose.value.max)), single: lu.dose.value.kind === 'single', unit: lu.dose.value.unit } : undefined;
  const save = async () => {
    if (!r.ok) { setFailed(true); return; }
    await putMany(db, [{ table: 'jobs', row: r.job, op: 'insert' }, ...r.jobPlantings.map((row) => ({ table: 'job_plantings', row, op: 'insert' as const }))]);
    dataVersion.value++; onDone(true);
  };
  const toggle = (id: string) => setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
  const needs = live(plantings).length === 0 || live(products).length === 0 || live(workers).length === 0;
  return (
    <section>
      <h1>{t('job.add')}</h1>
      {needs && <p class="msg error" role="alert" data-testid="job-needs">{t('spray.needs')}</p>}
      <h2>{t('spray.plantings')}</h2>
      <div class="seg two">{live(plantings).map((p) => <button key={p.id} aria-pressed={sel.includes(p.id)} onClick={() => toggle(p.id)}>{plantingName(p)}</button>)}</div>
      <h2>{t('spray.product')}</h2>
      <div class="seg two">{live(products).map((p) => <button key={p.id} aria-pressed={productId === p.id} onClick={() => { setProductId(p.id); offer(chosen.length ? live(labels).find((l) => l.product_id === p.id && l.crop_id === chosen[0]?.crop_id) : undefined); }}>{nameOf(p)}</button>)}</div>
      {productId && chosen.length > 0 && (
        <div class="card" data-testid="job-label"><strong>{t('spray.label.title')}</strong>
          {label ? <><span class={`badge ${statusOf(label)}`}>{badgeText(label, statusOf(label))}</span><Lines row={label} /></> : <span class="badge blocked">{t(FLAG_KEYS.label_none)}</span>}
        </div>
      )}
      <h2>{t('spray.worker')}</h2>
      <div class="seg two">{live(workers).map((w) => <button key={w.id} aria-pressed={workerId === w.id} onClick={() => setWorkerId(w.id)}>{String(w.name)}</button>)}</div>
      <label class="field">{t('job.date')}<input class="input" type="date" value={day} onInput={(e) => setDay((e.target as HTMLInputElement).value)} /></label>
      {labelDose && <p class="muted" data-testid="job-label-dose">{labelDose.single ? t('spray.label.dose', { v: labelDose.min, unit: t(UNIT_KEYS[labelDose.unit]) }) : t('spray.label.range', { a: labelDose.min, b: labelDose.max, unit: t(UNIT_KEYS[labelDose.unit]) })}</p>}
      {labelDose?.single && <button class="btn secondary" data-testid="job-dose-same" onClick={() => { setDose(labelDose.min); setUnit(labelDose.unit); }}>{t('spray.label.same')}</button>}
      <label class="field">{t('spray.dose')}<input class="input" value={dose} inputMode="decimal" autoComplete="off" data-testid="job-dose" onInput={(e) => setDose((e.target as HTMLInputElement).value)} /></label>
      <h2>{t('spray.unit')}</h2>
      <div class="seg two">{DOSE_UNITS.map((u) => <button key={u} aria-pressed={unit === u} onClick={() => setUnit(u)}>{t(UNIT_KEYS[u])}</button>)}</div>
      {r.ok && r.flags.length > 0 && <div class="card" data-testid="job-flags">{r.flags.map((f) => <span key={f} class={f === 'label_none' || f === 'label_blocked' ? 'badge blocked' : 'badge warn'}>{t(FLAG_KEYS[f])}</span>)}</div>}
      {failed && !r.ok && r.errors.label && !r.errors.plantings && !r.errors.product && <p class="msg error" role="alert" data-testid="job-nolabel">{t('job.error.nolabel')}</p>}
      {failed && !r.ok && (r.errors.plantings || r.errors.product || r.errors.worker || r.errors.dose || r.errors.doseUnit || r.errors.plannedFor) && <p class="msg error" role="alert" data-testid="job-error">{t('job.error.fill')}</p>}
      {failed && !r.ok && r.errors.doseUnit && <p class="msg error" role="alert">{t('job.error.unit')}</p>}
      <button class="btn" data-testid="job-save" onClick={() => void submit(save)} disabled={busy}>{t('job.save')}</button>
      <button class="btn secondary" onClick={() => onDone(false)}>{t('product.cancel')}</button>
    </section>
  );
}
