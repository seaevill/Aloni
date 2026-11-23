import { useEffect, useRef, useState } from 'preact/hooks';
import { activeFarm, dataVersion, db, realFarmId } from '../db';
import { formatDate, t } from '../i18n';
import { storePhoto } from '../media/photo';
import { addItem, dueDay, loadPlans, removeItem, setPhoto, type FertPlan } from '../fert/plan';
import { fertCalc, type FertCalc } from '../fert/calc';
import { formatQty } from '../i18n/format';
import { MediaThumb } from './Photos';
import './fert.css';

// Φυτά › a planting › «Πρόγραμμα λίπανσης»: the agronomist's plan typed IN HIS WORDS (day after sowing + his line) and a photo of his paper. The app proposes no fertiliser and no quantity,
// and sends no reminder («Υπενθυμίσεις κλειστές»: they stay closed until an agronomist has signed). Kept on this phone. Information only.
const calcText = (c: FertCalc): string => {
  if (!c.known) return c.reason === 'no-area' ? t('ui.fert.calc.noarea') : '';
  return c.bags.known ? t('ui.fert.calc.bags', { kg: formatQty(c.kg), n: c.bags.count }) : t('ui.fert.calc.kg', { kg: formatQty(c.kg) });
};

export function FertPlanCard({ plantingId, sownOn, areaStr }: { plantingId: string; sownOn: string; areaStr: string }) {
  const farm = activeFarm.value; const demo = farm !== realFarmId.value;
  const [plan, setPlan] = useState<FertPlan>({ items: [] }); const [adding, setAdding] = useState(false);
  const [day, setDay] = useState(''); const [text, setText] = useState(''); const [kgStr, setKgStr] = useState(''); const [bagKg, setBagKg] = useState(''); const [bad, setBad] = useState(false); const [photoMsg, setPhotoMsg] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const reload = async () => setPlan((await loadPlans(db, farm))[plantingId] ?? { items: [] });
  useEffect(() => { void reload(); }, [farm, plantingId]);
  const save = async () => {
    try { await addItem(db, farm, plantingId, { day, text, kgPerStr: kgStr, bagKg }, crypto.randomUUID()); setBad(false); setAdding(false); setDay(''); setText(''); setKgStr(''); setBagKg(''); await reload(); } catch { setBad(true); }
  };
  const pick = async (e: Event) => {
    const el = e.target as HTMLInputElement; const file = el.files?.[0]; el.value = '';
    if (!file) return;
    const stored = await storePhoto(db, realFarmId.value, file, new Date().toISOString());
    if (stored.result === 'error' || stored.id === undefined) { setPhotoMsg(true); return; }
    setPhotoMsg(false); await setPhoto(db, farm, plantingId, stored.id); dataVersion.value++; await reload();
  };
  return (
    <section class="card fert" data-testid="fert-plan">
      <h4>{t('ui.fert.title')}</h4>
      {plan.photoId && <div class="photos" data-testid="fert-photo"><MediaThumb id={plan.photoId} /></div>}
      {!demo && <>
        <input ref={input} type="file" accept="image/*" hidden aria-hidden="true" tabIndex={-1} onChange={(e) => void pick(e)} />
        <button type="button" class="btn secondary" data-testid="fert-photo-add" onClick={() => input.current?.click()}>{t('ui.fert.photo')}</button>
      </>}
      {photoMsg && <p class="msg error" role="alert" data-testid="fert-photo-err">{t('photos.error')}</p>}
      {plan.items.length === 0 && <p class="muted" data-testid="fert-none">{t('ui.fert.none')}</p>}
      {plan.items.map((i) => {
        const due = dueDay(sownOn, i.day);
        return (
          <div key={i.id} data-testid="fert-item">
            <strong>{t('ui.fert.day', { n: i.day })}</strong>
            <small>{t('ui.fert.written')}</small>
            <p class="fert-quote">{i.text}</p>
            {due !== undefined && <small data-testid="fert-date">{formatDate(due)}</small>}
            {calcText(fertCalc(i, areaStr)) !== '' && <small data-testid="fert-calc">{calcText(fertCalc(i, areaStr))}</small>}
            <button type="button" class="btn quiet" data-testid="fert-remove" onClick={() => void removeItem(db, farm, plantingId, i.id).then(reload)}>{t('ui.fert.remove')}</button>
          </div>
        );
      })}
      {!adding && <button type="button" class="btn secondary" data-testid="fert-add" onClick={() => setAdding(true)}>{t('ui.fert.add')}</button>}
      {adding && <div class="fert-form" data-testid="fert-form">
        <label class="field"><span class="ds-muted">{t('ui.fert.day.label')}</span><input class="input" inputMode="numeric" value={day} autoComplete="off" data-testid="fert-day" onInput={(e) => setDay((e.target as HTMLInputElement).value)} /></label>
        <label class="field"><span class="ds-muted">{t('ui.fert.text.label')}</span><textarea class="input" value={text} data-testid="fert-text" onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} /></label>
        <label class="field"><span class="ds-muted">{t('ui.fert.kg.label')}</span><input class="input" inputMode="decimal" value={kgStr} autoComplete="off" data-testid="fert-kg" onInput={(e) => setKgStr((e.target as HTMLInputElement).value)} /></label>
        <label class="field"><span class="ds-muted">{t('ui.fert.bag.label')}</span><input class="input" inputMode="decimal" value={bagKg} autoComplete="off" data-testid="fert-bag" onInput={(e) => setBagKg((e.target as HTMLInputElement).value)} /></label>
        {bad && <p class="msg error" role="alert" data-testid="fert-error">{t('ui.fert.err')}</p>}
        <button type="button" class="btn" data-testid="fert-save" onClick={() => void save()}>{t('ui.fert.save')}</button>
      </div>}
      <small data-testid="fert-reminders">{t('ui.fert.reminders')}</small>
      <small data-testid="fert-note">{t('ui.fert.note')}</small>
    </section>
  );
}
