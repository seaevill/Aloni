import { useEffect, useRef, useState } from 'preact/hooks';
import { activeFarm, dataVersion, db } from '../db';
import { AUTH_ENABLED, DEMO_FARM_ID, SYNC_CONNECTED } from '../config';
import { session } from '../auth/gotrue';
import { pendingOps } from '../repo';
import { groupJobs } from '../summary/jobs';
import { athensToday } from '../plantings/planting';
import { COMPLETE } from '../worker/remote';
import { cancelHeld, commitHeld, holdAction, type Held } from '../worker/held';
import { RPC_PREFIX } from '../repo';
import { formatDate, formatDateTime, lang, t, ts, type I18nKey, LANGS, LANG_META, ensureLang, restoreOwnerLang, setWorkerLang, workerLang } from '../i18n';
import { UNIT_KEYS } from './LabelUseForm';
import { formatDose } from '../i18n/format';
import { known, type Decimal } from '@aloni/rules-core';
import { putLocal, putMany } from '../repo';
import { isLate } from '../spray/spray';
import { storePhoto } from '../media/photo';
import { MediaThumb } from './Photos';
import { Chip } from './ds/Chip';
import { CheckDraw } from './ds/CheckDraw';
import { Icon } from './icons/Icon';
import { buildObservation, completeSprayJob, OBSERVATION_KINDS, SKIP_REASONS, skipSprayJob, type ObservationKind, type SkipReason } from '../worker/jobs';
import { athensInstant, athensLocalNow, instantOf } from '../spray/time';
import { doneBlocked, reiLockJob, type Lock } from '../spray/harvest';
import { useSubmit } from './useSubmit';
import type { Row } from '../db/schema';
import { DemoRibbon } from './DemoRibbon';
import { HarvestForm } from './HarvestForm';
import { nameOf } from './screens';
import { queuedKey } from './states';
import { showHeldUndo } from './Toast';
import { useRows } from './useRows';
import { workerView } from './nav';

const LANG_NAME = { el: 'lang.name.el', tr: 'lang.name.tr', en: 'lang.name.en', hi: 'lang.name.hi' } as const;
const DATA_LINES = ['worker.data.who', 'worker.data.what', 'worker.data.why', 'worker.data.noloc', 'worker.data.rights', 'worker.data.full'] as const;
/** Language-free symbols: they show in every language, whatever the translation says (a worker who cannot read the words still sees ✓ ✗ 🔒). */
const MARK = { ok: '✓', no: '✗', lock: '🔒' } as const;
const HOLD_MS = 10000; // 10 seconds to take it back
const JOB_GROUPS = [['overdue', 'jobs.group.overdue'], ['today', 'jobs.group.today'], ['tomorrow', 'jobs.group.tomorrow'], ['later', 'jobs.group.later']] as const;
const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const SKIP_KEYS: Record<SkipReason, I18nKey> = { rain: 'worker.skip.rain', wind: 'worker.skip.wind', no_product: 'worker.skip.no_product', other: 'worker.skip.other' };
const KIND_KEYS: Record<ObservationKind, I18nKey> = { dew: 'worker.kind.dew', frost_damage: 'worker.kind.frost_damage', disease: 'worker.kind.disease', pest: 'worker.kind.pest', other: 'worker.kind.other' };

/**
 * The worker's screens, on the SAME phone, for the Demo farm only: the jobs the manager assigned (done / not done, 72 px buttons, 10 s undo),
 * the harvest counter and an observation. The worker cannot change the product or the dose: there is no input for them.
 */
export function WorkerApp() {
  const { busy, submit } = useSubmit();
  const workers = useRows('workers'); const jobs = useRows('jobs'); const links = useRows('job_plantings'); const plantings = useRows('plantings');
  const sprays = useRows('job_spray'); const crops = useRows('crops'); const products = useRows('products'); const labels = useRows('label_uses'); const parcels = useRows('parcels');
  const real = activeFarm.value !== DEMO_FARM_ID; // a signed-in WORKER on the real farm (Έγινε = a call to the server); otherwise the Demo farm's practice view
  const farm = activeFarm.value;
  const people = workers.rows?.filter((w) => !w.deleted_at && (real ? w.user_id === session.value?.user_id : w.name !== 'Bora')) ?? [];
  const me = people.find((w) => w.id === workerView.value) ?? people[0];
  const [noticeSeen, setNoticeSeen] = useState(true);
  useEffect(() => { const w = workerLang(); if (w) void ensureLang(w).then(() => { lang.value = w; }).catch(() => undefined); return restoreOwnerLang; }, []);      // the worker's language lives only while this view is open
  useEffect(() => { void db.settings.get(`notice_seen_at:${text(me?.id)}`).then((r) => setNoticeSeen(r !== undefined)); }, [text(me?.id)]);
  const ackNotice = async () => { await putLocal(db, `notice_seen_at:${text(me?.id)}`, new Date().toISOString()); setNoticeSeen(true); };
  const [tabId, setTabId] = useState<'jobs' | 'harvest' | 'observe'>('jobs');
  const [lateReason, setLateReason] = useState(''); // «λόγος καθυστέρησης» for a time more than 7 days back
  const [harvestSaved, setHarvestSaved] = useState(false); // the «saved on the phone» line after a harvest record
  const [open, setOpen] = useState<{ job: string; mode: 'done' | 'skip' } | undefined>(undefined);
  const [held, setHeld] = useState<string[]>([]);
  const [photoId, setPhotoId] = useState<string | undefined>(undefined); const [photoAt, setPhotoAt] = useState(''); const [photoFailed, setPhotoFailed] = useState(false); const photoFile = useRef<HTMLInputElement>(null);
  const [lockMsg, setLockMsg] = useState<{ job: string; text: string } | undefined>(undefined); // what a press on a CLOSED «Έγινε» answers
  const [queued, setQueued] = useState<string[]>([]); // jobs whose «Έγινε» waits in the outbox for the signal
  useEffect(() => { void db.outbox.where('status').equals('pending').toArray().then((r) => setQueued(r.filter((o) => o.table === `${RPC_PREFIX}${COMPLETE}`).map((o) => o.row_id))); }, [pendingOps.value, dataVersion.value]);
  const [when, setWhen] = useState(athensLocalNow(new Date()) ?? ''); const [startWhen, setStartWhen] = useState(''); const [startError, setStartError] = useState(false);   // the start is REQUIRED (the server asks for it) and never pre-filled
  const [note, setNote] = useState('');
  const [parcel, setParcel] = useState(''); const [kind, setKind] = useState<ObservationKind | undefined>(undefined);
  if (!me || (real && !(AUTH_ENABLED && session.value))) return null;

  const mine = (jobs.rows ?? []).filter((j) => j.kind === 'spray' && j.worker_id === me.id && !held.includes(j.id));
  const open_ = mine.filter((j) => j.status === 'planned' && !queued.includes(j.id));
  const groups = groupJobs(open_, athensToday(new Date()) ?? '');
  const waiting = mine.filter((j) => j.status === 'planned' && queued.includes(j.id));
  const finished = mine.filter((j) => j.status !== 'planned');
  const plantingsOf = (job: Row) => (links.rows ?? []).filter((l) => l.job_id === job.id).map((l) => plantings.rows?.find((p) => p.id === l.planting_id)).filter((p): p is Row => !!p);
  const plantingName = (p: Row) => t('spray.planting', { crop: nameOf(crops.rows?.find((c) => c.id === p.crop_id) ?? {}), parcel: text(parcels.rows?.find((x) => x.id === p.parcel_id)?.name) });
  const lockOf = (job: Row): Lock => reiLockJob([...new Set(plantingsOf(job).map((p) => text(p.parcel_id)))], instantOf(new Date()) ?? '', plantings.rows ?? [], links.rows ?? [], sprays.rows ?? [], labels.rows ?? []); // ANY field of the job locks it
  const finishedLine = (j: Row): string => [j.status === 'done' ? t('worker.status.done') : t('worker.status.skipped'), j.done_at ? formatDateTime(text(j.done_at)) : ''].filter(Boolean).join(' · ');
  const lockText = (l: Lock): string => (l.state === 'running' ? ts('worker.lock.running', { d: formatDateTime(l.until) }) : ts('worker.lock.unknown'));
  const doseText = (j: Row) => t('labeluse.dosevalue', { v: formatDose(known(text(j.dose_str) as Decimal)), unit: t(UNIT_KEYS[j.dose_unit as keyof typeof UNIT_KEYS]) });

  /** The job disappears at once and the action is KEPT on the phone at once (settings «held_actions»); it is written as a record after 10 s, or at the next start; «Αναίρεση» removes the entry. */
  const holding = useRef(new Set<string>());      // a synchronous guard per job: a second tap while the first is being kept does nothing
  const hold = async (job: Row, h: Omit<Held, 'id' | 'at'>) => {
    if (holding.current.has(job.id)) return;
    holding.current.add(job.id);
    const entry: Held = { id: crypto.randomUUID(), at: new Date().toISOString(), ...h };
    setHeld([...held, job.id]); setOpen(undefined); setNote('');
    try { await holdAction(db, entry); } catch (e) { holding.current.delete(job.id); setHeld((x) => x.filter((id) => id !== job.id)); throw e; }
    showHeldUndo(t('worker.committed'), async () => { await cancelHeld(db, entry.id); holding.current.delete(job.id); setHeld((x) => x.filter((id) => id !== job.id)); },
      async () => { try { await commitHeld(db, entry.id); dataVersion.value++; } catch { /* the entry stays and is written at the next start */ } holding.current.delete(job.id); setHeld((x) => x.filter((id) => id !== job.id)); }, HOLD_MS);
  };
  // the shutter: the photo is shrunk and re-encoded here, which drops every EXIF tag (including GPS) before anything is stored or sent
  const pickPhoto = async (e: Event) => {
    const el = e.target as HTMLInputElement; const f = el.files?.[0]; el.value = '';
    if (!f) return;
    const r = await storePhoto(db, farm, f, new Date().toISOString());
    setPhotoFailed(r.result === 'error');
    if (r.id) { setPhotoId(r.id); setPhotoAt(formatDateTime(new Date().toISOString())); }
  };
  const confirmDone = (job: Row) => {
    const at = athensInstant(when); const start = athensInstant(startWhen);
    if (!at || !start || Date.parse(start) > Date.parse(at)) { setStartError(true); return undefined; }
    setStartError(false);
    if (real) { return hold(job, { completion: { farm, jobId: job.id, at, start, note, lateReason } }); return; }
    const label = (labels.rows ?? []).find((l) => l.id === job.label_use_id);
    const c = at ? completeSprayJob(job, label, plantingsOf(job), me, at, note, new Date().toISOString(), crypto.randomUUID(), lateReason, start) : undefined;
    if (c?.ok) return hold(job, { writes: [{ table: 'jobs', row: c.job }, { table: 'job_spray', row: c.spray, op: 'insert' }] });
  };
  const confirmSkip = (job: Row, reason: SkipReason) => {
    const row = skipSprayJob(job, me, reason, new Date().toISOString());
    if (row) return hold(job, { writes: [{ table: 'jobs', row }] });
  };
  const saveObservation = () => {
    const row = buildObservation(parcel, kind, note, me, farm, new Date().toISOString(), crypto.randomUUID(), photoId);
    if (!row) return undefined;
    const entry: Held = { id: crypto.randomUUID(), at: new Date().toISOString(), writes: [{ table: 'observations', row, op: 'insert' }] };
    setNote(''); setKind(undefined); setPhotoId(undefined); setPhotoAt('');           // the form is cleared AT ONCE: a second tap cannot save the same observation again
    return holdAction(db, entry).then(() => showHeldUndo(t('worker.committed'), () => cancelHeld(db, entry.id), async () => { try { await commitHeld(db, entry.id); dataVersion.value++; } catch { /* written at the next start */ } }, HOLD_MS));
  };
  const TABS: Array<['jobs' | 'harvest' | 'observe', I18nKey]> = [['jobs', 'worker.tab.jobs'], ['harvest', 'worker.tab.harvest'], ['observe', 'worker.tab.observe']];

  return (
    <main data-testid="worker-app">
      {lang.value === 'hi' && <p class="badge warn bi" data-testid="hi-review">{ts('lang.review')}</p>}
      <div class="seg big" data-testid="worker-lang">{LANGS.map((l) => <button key={l} lang={l} aria-label={t(LANG_NAME[l])} aria-pressed={lang.value === l} onClick={() => setWorkerLang(l)}>{LANG_META[l].label}</button>)}</div>
      <h1>{t('worker.title')}</h1>
      <details class="card" data-testid="worker-data" open={!noticeSeen}>
        <summary>{t('worker.data.title')}</summary>
        {DATA_LINES.map((k) => <p key={k}>{t(k)}</p>)}
        {!noticeSeen && <button class="btn big" data-testid="worker-data-ack" onClick={() => void ackNotice()}>{t('worker.data.ack')}</button>}
      </details>
      {!real && <DemoRibbon />}
      {!real && <h2>{t('worker.choose')}</h2>}
      {!real && <div class="seg two big">{people.map((w) => <button key={w.id} aria-pressed={w.id === me.id} onClick={() => workerView.value = w.id}>{text(w.name)}</button>)}</div>}

      {tabId === 'harvest' && harvestSaved && <p class="msg" role="status" data-testid="worker-status-harvest">{t('harvest.saved')} {t(queuedKey(SYNC_CONNECTED))}</p>}
      {tabId === 'jobs' && (
        <>
          <h2>{t('worker.jobs')}</h2>
          {open_.length === 0 && <p class="muted" data-testid="worker-nojobs">{t('worker.noJobs')}</p>}
          {JOB_GROUPS.map(([gk, glabel]) => groups[gk].length > 0 && (<section key={gk}><h3 class={gk === 'overdue' ? 'late' : undefined} data-testid={`worker-group-${gk}`}>{t(glabel)}</h3>
          {groups[gk].map((j) => (
            <div class={lockOf(j).state === 'none' ? 'card job' : 'card job locked'} key={j.id} data-testid="worker-job"><strong class="job-title">{nameOf(products.rows?.find((p) => p.id === j.product_id) ?? {})}</strong>
              {typeof j.planned_for === 'string' && j.planned_for !== athensToday(new Date()) && <small class="late" data-testid="worker-job-date">{formatDate(j.planned_for)}</small>}
              {plantingsOf(j).map((p) => <small key={p.id}>{plantingName(p)}</small>)}
              <small data-testid="worker-dose">{t('labeluse.line', { name: t('labeluse.dose'), value: doseText(j) })}</small>
              <small>{t('worker.fixed')}</small>
              {lockOf(j).state !== 'none' && <div class="ds-chip-block" role="alert" data-testid="worker-lock"><Chip tone="blocked">{lockText(lockOf(j))}</Chip></div>}
              {open?.job !== j.id && (
                <div class="seg two big">
                  <button class="go" data-testid="job-done" aria-disabled={doneBlocked(lockOf(j)) ? 'true' : undefined} onClick={() => { if (doneBlocked(lockOf(j))) { setLockMsg({ job: j.id, text: lockText(lockOf(j)) }); return; } setLockMsg(undefined); setOpen({ job: j.id, mode: 'done' }); }}><span aria-hidden="true">{MARK.ok}</span> {t('worker.done')}</button>
                  {!real && <button class="stop" data-testid="job-skip" onClick={() => setOpen({ job: j.id, mode: 'skip' })}><span aria-hidden="true">{MARK.no}</span> {t('worker.notdone')}</button>}
                </div>
              )}
              {lockMsg?.job === j.id && open?.job !== j.id && doneBlocked(lockOf(j)) && <div class="ds-chip-block" role="alert" data-testid="worker-lock-why"><Chip tone="blocked">{lockMsg.text}</Chip></div>}
              {open?.job === j.id && open.mode === 'done' && (
                <>
                  <label class="field">{t('worker.start')}<input class="input" type="datetime-local" value={startWhen} data-testid="worker-start" onInput={(e) => setStartWhen((e.target as HTMLInputElement).value)} /></label>
                  {startError && <p class="msg error" role="alert" data-testid="worker-start-error">{t('worker.start.error')}</p>}
                  <label class="field">{t('worker.time')}<input class="input" type="datetime-local" value={when} onInput={(e) => setWhen((e.target as HTMLInputElement).value)} /></label>
                  {isLate(athensInstant(when) ?? '', new Date().toISOString()) && athensInstant(when) !== undefined && (
                    <label class="field">{t('spray.late.reason')}<input class="input" value={lateReason} autoComplete="off" data-testid="worker-late-reason" onInput={(e) => setLateReason((e.target as HTMLInputElement).value)} /></label>
                  )}
                  <label class="field">{t('worker.note')}<input class="input" value={note} autoComplete="off" onInput={(e) => setNote((e.target as HTMLInputElement).value)} /></label>
                  <button class="btn big" data-testid="job-confirm" onClick={() => void submit(() => confirmDone(j))} disabled={busy}>{t('worker.confirm')}</button>
                  <button class="btn secondary big" data-testid="job-back" onClick={() => setOpen(undefined)}>{t('worker.back')}</button>
                </>
              )}
              {open?.job === j.id && open.mode === 'skip' && (
                <>
                  <h2>{t('worker.skip.title')}</h2>
                  <div class="seg two big">{SKIP_REASONS.map((r) => <button key={r} data-testid={`skip-${r}`} onClick={() => confirmSkip(j, r)}>{t(SKIP_KEYS[r])}</button>)}</div>
                  <button class="btn secondary big" data-testid="job-back" onClick={() => setOpen(undefined)}>{t('worker.back')}</button>
                </>
              )}
            </div>
          ))}</section>))}
          {(finished.length > 0 || waiting.length > 0) && <h2>{t('worker.doneList')}</h2>}
          {waiting.map((j) => (
            <div class="card" key={j.id} data-testid="worker-waiting">{nameOf(products.rows?.find((p) => p.id === j.product_id) ?? {})}
              <small class="status-line">{t(queuedKey(SYNC_CONNECTED))}</small>
            </div>
          ))}
          {finished.map((j) => (
            <div class="card" key={j.id} data-testid="worker-finished">{nameOf(products.rows?.find((p) => p.id === j.product_id) ?? {})}
              <small class="worker-finished-line">{j.status === 'done' && <CheckDraw />}{finishedLine(j)}</small>
              {j.status === 'done' && <small class="status-line" data-testid="worker-status">{t(queuedKey(SYNC_CONNECTED))}</small>}
            </div>
          ))}
        </>
      )}
      {tabId === 'harvest' && <HarvestForm farmId={farm} actorId={me.id} big onDone={(saved) => { setHarvestSaved(saved); if (!saved) setTabId('jobs'); }} />}
      {tabId === 'observe' && (
        <>
          <h2>{t('worker.observe.parcel')}</h2>
          <div class="seg two big">{(parcels.rows ?? []).map((p) => <button key={p.id} aria-pressed={parcel === p.id} onClick={() => setParcel(p.id)}>{text(p.name)}</button>)}</div>
          <h2>{t('worker.observe.kind')}</h2>
          <div class="seg two big">{OBSERVATION_KINDS.map((k) => <button key={k} aria-pressed={kind === k} data-testid={`kind-${k}`} onClick={() => setKind(k)}>{t(KIND_KEYS[k])}</button>)}</div>
          <label class="field">{t('worker.observe.note')}<input class="input" value={note} autoComplete="off" onInput={(e) => setNote((e.target as HTMLInputElement).value)} /></label>
          <input ref={photoFile} type="file" accept="image/*" capture="environment" hidden aria-hidden="true" tabIndex={-1} data-testid="observe-photo-input" onChange={(e) => void pickPhoto(e)} />
          <button class="btn shutter" data-testid="observe-photo" onClick={() => photoFile.current?.click()}><Icon name="camera" /><span>{t('worker.observe.photo')}</span></button>
          {photoId && <div class="photos" data-testid="observe-thumb"><MediaThumb id={photoId} /><Chip tone="info">{photoAt}</Chip></div>}
          {photoFailed && <p class="msg error" role="alert">{t('photos.error')}</p>}
          <button class="btn big" data-testid="observe-save" onClick={() => void submit(() => saveObservation())} disabled={busy}>{t('worker.observe.save')}</button>
        </>
      )}
      <div class="seg big worker-tray" data-testid="worker-tray">{TABS.map(([id, k]) => <button key={id} aria-pressed={tabId === id} data-testid={`worker-tab-${id}`} onClick={() => { setHarvestSaved(false); setTabId(id); }}>{t(k)}</button>)}</div>
      <button class="btn secondary" data-testid="worker-exit" onClick={() => { workerView.value = undefined; }}>{t('worker.exit')}</button>
    </main>
  );
}
