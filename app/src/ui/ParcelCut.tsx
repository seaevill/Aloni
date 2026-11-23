import { useState } from 'preact/hooks';
import { activeFarm, db } from '../db';
import { formatDate, t, type I18nKey } from '../i18n';
import { formatQty } from '../i18n/format';
import { athensToday } from '../plantings/planting';
import { CUT_METHODS, addCut, removeCut, resprout, type CutMethod, type CutRecord } from '../cuts/cuts';
import { Icon } from './icons/Icon';
import './parcel-cut.css';
import { NoteTip } from './NoteTip';

// Χωράφι › «Κοπή / καθαρισμός»: one tap to record that the parcel was cut or cleaned (e.g. wild chicory shredded with the tractor); the counter «νέα βλάστηση: ημέρα N» counts from that day.
// Kept on this phone for now (the screen says so). Information only: no advice about watering, feeding or spraying.
export const METHOD_KEYS: Record<CutMethod, I18nKey> = { shredder: 'ui.cut.method.shredder', hand: 'ui.cut.method.hand', other: 'ui.cut.method.other' };

export function ParcelCut({ parcelId, cuts, onChange }: { parcelId: string; cuts: readonly CutRecord[]; onChange: () => void }) {
  const today = athensToday(new Date()) ?? '1970-01-01';
  const [open, setOpen] = useState(false); const [method, setMethod] = useState<CutMethod>('shredder'); const [day, setDay] = useState(today);
  const sprout = resprout(cuts, parcelId, today);
  const save = async () => { try { await addCut(db, activeFarm.value, { parcel_id: parcelId, day, method }, crypto.randomUUID()); setOpen(false); onChange(); } catch { /* the Save button is disabled for a bad day */ } };
  const mine = cuts.filter((c) => c.parcel_id === parcelId).sort((a, b) => b.day.localeCompare(a.day));
  return (
    <section class="card parcel-cut-card" data-testid="parcel-cut">
      <h3 class="icon-head"><Icon name="cut" />{t('ui.cut.title')}</h3>
      {sprout ? <>
        <p data-testid="cut-last"><strong>{formatDate(sprout.day)}</strong>{t('ui.cut.sep', { method: t(METHOD_KEYS[sprout.method]) })}</p>
        {sprout.n >= 1 && <p data-testid="cut-sprout">{t('ui.cut.sprout', { n: formatQty(sprout.n) })}</p>}
      </> : <p class="muted" data-testid="cut-none">{t('ui.cut.none')}</p>}
      {!open && <button type="button" class="btn secondary" data-testid="cut-open" onClick={() => setOpen(true)}>{t('ui.cut.add')}</button>}
      {open && <div class="parcel-cut-form" data-testid="cut-form">
        <div class="chips" role="group" aria-label={t('ui.cut.method')}>
          {CUT_METHODS.map((m) => <button key={m} type="button" class="tag-btn" aria-pressed={method === m} data-testid={`cut-method-${m}`} onClick={() => setMethod(m)}>{t(METHOD_KEYS[m])}</button>)}
        </div>
        <label class="field"><span class="ds-muted">{t('ui.cut.date')}</span><input class="input" type="date" max={today} value={day} data-testid="cut-day" onInput={(e) => setDay((e.target as HTMLInputElement).value)} /></label>
        <button type="button" class="btn" data-testid="cut-save" disabled={day === '' || day > today} onClick={() => void save()}>{t('ui.cut.save')}</button>
      </div>}
      {mine.length > 0 && <button type="button" class="btn quiet" data-testid="cut-undo" onClick={() => void removeCut(db, activeFarm.value, (mine[0] as CutRecord).id).then(onChange)}>{t('ui.cut.undo')}</button>}
      <NoteTip testid="cut-local" text={t('ui.cut.local')} />
    </section>
  );
}
