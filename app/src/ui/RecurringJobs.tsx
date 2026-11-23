import { useEffect, useState } from 'preact/hooks';
import { activeFarm, db } from '../db';
import { formatDate, t } from '../i18n';
import { athensToday } from '../plantings/planting';
import { addRule, dueToday, loadRules, nextOccurrence, removeRule, type Rule } from '../recurring/recurring';

// Εργασίες › «Επαναλαμβανόμενες»: a job written once («Κάθε Δευτέρα: έλεγχος χωραφιού») that comes back every week, in the owner's list and on the worker screen of the SAME phone.
// Kept on this phone per farm; the screen says so. A line the owner wrote himself: no spray, no dose, no advice.
const WEEK = ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29'] as const;      // a known Monday…Sunday, only to get the weekday names in the screen's language
export const weekdayName = (weekday: number): string => formatDate(WEEK[weekday - 1] as string).split(' ')[0] as string;

export function RecurringJobs() {
  const farm = activeFarm.value;
  const [rules, setRules] = useState<Rule[]>([]); const [adding, setAdding] = useState(false); const [weekday, setWeekday] = useState(1); const [title, setTitle] = useState(''); const [bad, setBad] = useState(false);
  const load = async () => setRules(await loadRules(db, farm));
  useEffect(() => { void load(); }, [farm]);
  const today = athensToday(new Date()) ?? '';
  const save = async () => { try { await addRule(db, farm, { weekday, title, scope: 'all' }, crypto.randomUUID()); setBad(false); setAdding(false); setTitle(''); await load(); } catch { setBad(true); } };
  return (
    <section data-testid="recurring">
      <h3>{t('ui.rec.title')}</h3>
      {rules.length === 0 && <p class="ds-muted" data-testid="rec-none">{t('ui.rec.none')}</p>}
      {rules.map((r) => {
        const next = nextOccurrence(r.weekday, today);
        return (
          <div class="card" key={r.id} data-testid="rec-rule">
            <strong>{t('ui.rec.every', { day: weekdayName(r.weekday) })}</strong>
            <span>{r.title}</span>
            {next !== undefined && <small data-testid="rec-next">{t('ui.rec.next', { day: formatDate(next) })}</small>}
            <button type="button" class="btn quiet" data-testid="rec-remove" onClick={() => void removeRule(db, farm, r.id).then(load)}>{t('ui.rec.remove')}</button>
          </div>
        );
      })}
      {!adding && <button type="button" class="btn secondary" data-testid="rec-add" onClick={() => setAdding(true)}>{t('ui.rec.add')}</button>}
      {adding && <div class="rec-form" data-testid="rec-form">
        <div class="chips" role="group" aria-label={t('ui.rec.day')}>
          {WEEK.map((_, i) => <button key={i} type="button" class="tag-btn" aria-pressed={weekday === i + 1} data-testid={`rec-day-${i + 1}`} onClick={() => setWeekday(i + 1)}>{weekdayName(i + 1)}</button>)}
        </div>
        <label class="field"><span class="ds-muted">{t('ui.rec.what')}</span><input class="input" value={title} autoComplete="off" data-testid="rec-title" onInput={(e) => setTitle((e.target as HTMLInputElement).value)} /></label>
        {bad && <p class="msg error" role="alert" data-testid="rec-error">{t('ui.rec.err')}</p>}
        <button type="button" class="btn" data-testid="rec-save" onClick={() => void save()}>{t('ui.rec.save')}</button>
      </div>}
      <small data-testid="rec-local">{t('ui.rec.local')}</small>
    </section>
  );
}

/** The worker screen: today's repeating jobs, read-only. */
export function RecurringToday() {
  const farm = activeFarm.value; const [rules, setRules] = useState<Rule[]>([]);
  useEffect(() => { void loadRules(db, farm).then(setRules); }, [farm]);
  const due = dueToday(rules, athensToday(new Date()) ?? '');
  if (due.length === 0) return null;
  return (
    <section data-testid="rec-today">
      <h2>{t('ui.rec.today')}</h2>
      {due.map((r) => <div class="card" key={r.id} data-testid="rec-today-item">{r.title}</div>)}
    </section>
  );
}
