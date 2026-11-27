import { useEffect, useState } from 'preact/hooks';
import { activeFarm, db } from '../db';
import { formatDate, t } from '../i18n';
import { formatQty } from '../i18n/format';
import { athensToday } from '../plantings/planting';
import { useSubmit } from './useSubmit';
import { addWork, loadWork, removeWork, snapshotOf, type Snapshot, type Work } from '../fieldwork/fieldwork';
import type { Day } from '../weather/strip';
import { weatherLine } from '../weather/line';
import './fieldwork.css';

// Χωράφι › «Λίπανση / Άρδευση»: RECORDS of what was done, typed by the owner (the app suggests nothing). The weather of that day is copied from the stored weather when it is known.
// Kept on this phone per farm (the server tables exist but do not sync yet); the screen says so.
const MAX_SHOWN = 5;
const lineOf = (w: Work): string => {
  if (w.kind === 'fertilise') return [t('ui.work.fertilise'), t('ui.work.nform', { v: w.n_form ?? '' }), w.n_kg_per_str ? t('ui.work.nkg', { v: w.n_kg_per_str }) : ''].filter((x) => x !== '').join(' · ');
  return [t('ui.work.irrigate'), w.minutes ? t('ui.work.minutes', { v: w.minutes }) : '', w.m3 ? t('ui.work.m3', { v: w.m3 }) : ''].filter((x) => x !== '').join(' · ');
};

export function FieldWorkCard({ parcelId, days, onChange }: { parcelId: string; days: readonly Day[]; onChange?: (all: Work[]) => void }) {
  const { busy, submit } = useSubmit();
  const farm = activeFarm.value; const today = athensToday(new Date()) ?? '1970-01-01';
  const [all, setAll] = useState<Work[]>([]); const [kind, setKind] = useState<'fertilise' | 'irrigate'>(); const [bad, setBad] = useState(false);
  const [day, setDay] = useState(today); const [nForm, setNForm] = useState(''); const [nKg, setNKg] = useState(''); const [minutes, setMinutes] = useState(''); const [m3, setM3] = useState('');
  const load = async () => { const stored = await loadWork(db, farm); setAll(stored); onChange?.(stored); };
  useEffect(() => { void load(); }, [farm]);
  const mine = all.filter((w) => w.parcel_id === parcelId).sort((a, b) => b.day.localeCompare(a.day)).slice(0, MAX_SHOWN);
  const open = (k: 'fertilise' | 'irrigate') => { setKind(k); setBad(false); setDay(today); setNForm(''); setNKg(''); setMinutes(''); setM3(''); };
  const save = async () => {
    if (kind === undefined) return;
    try {
      await addWork(db, farm, { parcel_id: parcelId, kind, day, n_form: nForm, n_kg_per_str: nKg, minutes, m3 }, crypto.randomUUID(), today, snapshotOf(days, day));
      setKind(undefined); await load();
    } catch { setBad(true); }
  };
  const errorText = t(kind === 'fertilise' ? 'ui.work.err.fertilise' : 'ui.work.err.irrigate');
  return (
    <section class="card fieldwork" data-testid="fieldwork">
      <h3>{t('ui.work.title')}</h3>
      {mine.length === 0 && <p class="muted" data-testid="work-none">{t('ui.work.none')}</p>}
      {mine.map((w) => (
        <div key={w.id} class="work-item" data-testid="work-item" data-kind={w.kind}>
          <strong>{formatDate(w.day)}</strong>
          <span>{lineOf(w)}</span>
          <small data-testid="work-wx">{weatherLine(w.weather)}</small>
          <button type="button" class="btn quiet" data-testid="work-remove" onClick={() => void removeWork(db, farm, w.id).then(load)}>{t('ui.work.remove')}</button>
        </div>
      ))}
      {kind === undefined && <div class="fieldwork-buttons">
        <button type="button" class="btn secondary" data-testid="work-add-fertilise" onClick={() => open('fertilise')}>{t('ui.work.add.fertilise')}</button>
        <button type="button" class="btn secondary" data-testid="work-add-irrigate" onClick={() => open('irrigate')}>{t('ui.work.add.irrigate')}</button>
      </div>}
      {kind !== undefined && <div class="fieldwork-form" data-testid="work-form">
        <label class="field"><span class="ds-muted">{t('ui.work.day')}</span><input class="input" type="date" max={today} value={day} data-testid="work-day" onInput={(e) => setDay((e.target as HTMLInputElement).value)} /></label>
        {kind === 'fertilise' && <>
          <label class="field"><span class="ds-muted">{t('ui.work.nform.label')}</span><input class="input" value={nForm} autoComplete="off" data-testid="work-nform" onInput={(e) => setNForm((e.target as HTMLInputElement).value)} /></label>
          <label class="field"><span class="ds-muted">{t('ui.work.nkg.label')}</span><input class="input" inputMode="decimal" value={nKg} autoComplete="off" data-testid="work-nkg" onInput={(e) => setNKg((e.target as HTMLInputElement).value)} /></label>
        </>}
        {kind === 'irrigate' && <>
          <label class="field"><span class="ds-muted">{t('ui.work.minutes.label')}</span><input class="input" inputMode="numeric" value={minutes} autoComplete="off" data-testid="work-minutes" onInput={(e) => setMinutes((e.target as HTMLInputElement).value)} /></label>
          <label class="field"><span class="ds-muted">{t('ui.work.m3.label')}</span><input class="input" inputMode="decimal" value={m3} autoComplete="off" data-testid="work-m3" onInput={(e) => setM3((e.target as HTMLInputElement).value)} /></label>
        </>}
        {bad && <p class="msg error" role="alert" data-testid="work-error">{errorText}</p>}
        <button type="button" class="btn" data-testid="work-save" disabled={busy} onClick={() => void submit(save)}>{t('ui.work.save')}</button>
        <button type="button" class="btn quiet" data-testid="work-cancel" onClick={() => setKind(undefined)}>{t('ui.work.cancel')}</button>
      </div>}
      <small data-testid="work-local">{t('ui.work.local')}</small>
      <small data-testid="work-note">{t('ui.work.note')}</small>
    </section>
  );
}
