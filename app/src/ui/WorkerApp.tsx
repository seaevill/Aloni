import { useState } from 'preact/hooks';
import { activeFarm, dataVersion, db } from '../db';
import { DEMO_FARM_ID } from '../config';
import { formatDateTime, t, type I18nKey } from '../i18n';
import { UNIT_KEYS } from './LabelUseForm';
import { formatDose } from '../i18n/format';
import { known, type Decimal } from '@aloni/rules-core';
import { putMany } from '../repo';
import { buildObservation, completeSprayJob, OBSERVATION_KINDS, SKIP_REASONS, skipSprayJob, type ObservationKind, type SkipReason } from '../worker/jobs';
import { instantOf } from '../spray/time';
import type { Row } from '../db/schema';
import { HarvestForm } from './HarvestForm';
import { nameOf } from './screens';
import { showHeldUndo } from './Toast';
import { useRows } from './useRows';
import { workerView } from './nav';

const HOLD_MS = 10000; // 10 seconds to take it back
const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const SKIP_KEYS: Record<SkipReason, I18nKey> = { rain: 'worker.skip.rain', wind: 'worker.skip.wind', no_product: 'worker.skip.no_product', other: 'worker.skip.other' };
const KIND_KEYS: Record<ObservationKind, I18nKey> = { dew: 'worker.kind.dew', frost_damage: 'worker.kind.frost_damage', disease: 'worker.kind.disease', pest: 'worker.kind.pest', other: 'worker.kind.other' };
const localNow = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().replace(/:\d{2}\.\d{3}Z$/, '');

/**
 * The worker's screens, on the SAME phone, for the Demo farm only: the jobs the manager assigned (done / not done, 72 px buttons, 10 s undo),
 * the harvest counter and an observation. The worker cannot change the product or the dose: there is no input for them.
 */
export function WorkerApp() {
  const workers = useRows('workers'); const jobs = useRows('jobs'); const links = useRows('job_plantings'); const plantings = useRows('plantings');
  const crops = useRows('crops'); const products = useRows('products'); const labels = useRows('label_uses'); const parcels = useRows('parcels');
  const people = workers.rows?.filter((w) => !w.deleted_at && w.name !== 'Bora') ?? [];
  const me = people.find((w) => w.id === workerView.value) ?? people[0];
  const [tabId, setTabId] = useState<'jobs' | 'harvest' | 'observe'>('jobs');
  const [open, setOpen] = useState<{ job: string; mode: 'done' | 'skip' } | undefined>(undefined);
  const [held, setHeld] = useState<string[]>([]);
  const [when, setWhen] = useState(localNow());
  const [note, setNote] = useState('');
  const [parcel, setParcel] = useState(''); const [kind, setKind] = useState<ObservationKind | undefined>(undefined);
  if (activeFarm.value !== DEMO_FARM_ID || !me) return null;

  const mine = (jobs.rows ?? []).filter((j) => j.kind === 'spray' && j.worker_id === me.id && !held.includes(j.id));
  const open_ = mine.filter((j) => j.status === 'planned');
  const finished = mine.filter((j) => j.status !== 'planned');
  const plantingsOf = (job: Row) => (links.rows ?? []).filter((l) => l.job_id === job.id).map((l) => plantings.rows?.find((p) => p.id === l.planting_id)).filter((p): p is Row => !!p);
  const plantingName = (p: Row) => t('spray.planting', { crop: nameOf(crops.rows?.find((c) => c.id === p.crop_id) ?? {}), parcel: text(parcels.rows?.find((x) => x.id === p.parcel_id)?.name) });
  const finishedLine = (j: Row): string => [j.status === 'done' ? t('worker.status.done') : t('worker.status.skipped'), j.done_at ? formatDateTime(text(j.done_at)) : ''].filter(Boolean).join(' · ');
  const doseText = (j: Row) => t('labeluse.dosevalue', { v: formatDose(known(text(j.dose_str) as Decimal)), unit: t(UNIT_KEYS[j.dose_unit as keyof typeof UNIT_KEYS]) });

  const hold = (job: Row, write: () => Promise<void>) => { // the job disappears at once; the record is written only after 10 s, unless taken back
    setHeld([...held, job.id]); setOpen(undefined); setNote('');
    showHeldUndo(t('worker.committed'), () => setHeld((h) => h.filter((x) => x !== job.id)), async () => { await write(); dataVersion.value++; setHeld((h) => h.filter((x) => x !== job.id)); }, HOLD_MS);
  };
  const confirmDone = (job: Row) => {
    const at = instantOf(new Date(when));
    const label = (labels.rows ?? []).find((l) => l.id === job.label_use_id);
    const c = at ? completeSprayJob(job, label, plantingsOf(job), me, at, note, new Date().toISOString(), crypto.randomUUID()) : undefined;
    if (c?.ok) hold(job, () => putMany(db, [{ table: 'jobs', row: c.job }, { table: 'job_spray', row: c.spray, op: 'insert' }]));
  };
  const confirmSkip = (job: Row, reason: SkipReason) => {
    const row = skipSprayJob(job, me, reason, new Date().toISOString());
    if (row) hold(job, () => putMany(db, [{ table: 'jobs', row }]));
  };
  const saveObservation = () => {
    const row = buildObservation(parcel, kind, note, me, DEMO_FARM_ID, new Date().toISOString(), crypto.randomUUID());
    if (!row) return;
    showHeldUndo(t('worker.committed'), () => undefined, async () => { await putMany(db, [{ table: 'observations', row, op: 'insert' }]); dataVersion.value++; }, HOLD_MS);
    setNote(''); setKind(undefined);
  };
  const TABS: Array<['jobs' | 'harvest' | 'observe', I18nKey]> = [['jobs', 'worker.tab.jobs'], ['harvest', 'worker.tab.harvest'], ['observe', 'worker.tab.observe']];

  return (
    <main data-testid="worker-app">
      <h1>{t('worker.title')}<span class="badge">{t('badge.demo')}</span></h1>
      <p class="muted">{t('worker.demoNote')}</p>
      <h2>{t('worker.choose')}</h2>
      <div class="seg two big">{people.map((w) => <button key={w.id} aria-pressed={w.id === me.id} onClick={() => workerView.value = w.id}>{text(w.name)}</button>)}</div>
      <div class="seg big">{TABS.map(([id, k]) => <button key={id} aria-pressed={tabId === id} data-testid={`worker-tab-${id}`} onClick={() => setTabId(id)}>{t(k)}</button>)}</div>

      {tabId === 'jobs' && (
        <>
          <h2>{t('worker.jobs')}</h2>
          {open_.length === 0 && <p class="muted" data-testid="worker-nojobs">{t('worker.noJobs')}</p>}
          {open_.map((j) => (
            <div class="card" key={j.id} data-testid="worker-job">{nameOf(products.rows?.find((p) => p.id === j.product_id) ?? {})}
              {plantingsOf(j).map((p) => <small key={p.id}>{plantingName(p)}</small>)}
              <small data-testid="worker-dose">{t('labeluse.line', { name: t('labeluse.dose'), value: doseText(j) })}</small>
              <small>{t('worker.fixed')}</small>
              {open?.job !== j.id && (
                <div class="seg two big">
                  <button data-testid="job-done" onClick={() => setOpen({ job: j.id, mode: 'done' })}>{t('worker.done')}</button>
                  <button data-testid="job-skip" onClick={() => setOpen({ job: j.id, mode: 'skip' })}>{t('worker.notdone')}</button>
                </div>
              )}
              {open?.job === j.id && open.mode === 'done' && (
                <>
                  <label class="field">{t('worker.time')}<input class="input" type="datetime-local" value={when} onInput={(e) => setWhen((e.target as HTMLInputElement).value)} /></label>
                  <label class="field">{t('worker.note')}<input class="input" value={note} autoComplete="off" onInput={(e) => setNote((e.target as HTMLInputElement).value)} /></label>
                  <button class="btn big" data-testid="job-confirm" onClick={() => confirmDone(j)}>{t('worker.confirm')}</button>
                </>
              )}
              {open?.job === j.id && open.mode === 'skip' && (
                <>
                  <h2>{t('worker.skip.title')}</h2>
                  <div class="seg two big">{SKIP_REASONS.map((r) => <button key={r} data-testid={`skip-${r}`} onClick={() => confirmSkip(j, r)}>{t(SKIP_KEYS[r])}</button>)}</div>
                </>
              )}
            </div>
          ))}
          {finished.length > 0 && <h2>{t('worker.doneList')}</h2>}
          {finished.map((j) => (
            <div class="card" key={j.id} data-testid="worker-finished">{nameOf(products.rows?.find((p) => p.id === j.product_id) ?? {})}
              <small>{finishedLine(j)}</small>
            </div>
          ))}
        </>
      )}
      {tabId === 'harvest' && <HarvestForm farmId={DEMO_FARM_ID} actorId={me.id} big onDone={() => setTabId('jobs')} />}
      {tabId === 'observe' && (
        <>
          <h2>{t('worker.observe.parcel')}</h2>
          <div class="seg two big">{(parcels.rows ?? []).map((p) => <button key={p.id} aria-pressed={parcel === p.id} onClick={() => setParcel(p.id)}>{text(p.name)}</button>)}</div>
          <h2>{t('worker.observe.kind')}</h2>
          <div class="seg two big">{OBSERVATION_KINDS.map((k) => <button key={k} aria-pressed={kind === k} data-testid={`kind-${k}`} onClick={() => setKind(k)}>{t(KIND_KEYS[k])}</button>)}</div>
          <label class="field">{t('worker.observe.note')}<input class="input" value={note} autoComplete="off" onInput={(e) => setNote((e.target as HTMLInputElement).value)} /></label>
          <button class="btn big" data-testid="observe-save" onClick={saveObservation}>{t('worker.observe.save')}</button>
        </>
      )}
      <button class="btn secondary" data-testid="worker-exit" onClick={() => { workerView.value = undefined; }}>{t('worker.exit')}</button>
    </main>
  );
}
