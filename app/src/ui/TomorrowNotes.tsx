import { useEffect, useState } from 'preact/hooks';
import { activeFarm, dataVersion, db } from '../db';
import { formatDate, t } from '../i18n';
import { nextDay } from '../orders/tomorrow';
import { athensToday } from '../plantings/planting';
import { delLocal, put, putLocal } from '../repo';
import { buildDayNote } from '../owner-records/records';
import { serverNotesOn } from '../owner-records/mode';
import { useRows } from './useRows';

// Εργασίες → notes for the next days («＋ Σημείωση για αύριο»). The owner and the worker write and read them; a note a worker wrote is tagged «από εργάτη».
// On the SERVER (SQL 0039; the owner's confirmation, or a signed-in worker's phone) the notes are shared between phones and «from a worker» is set by the SERVER from the writer's role; before that they stay on this phone per farm, exactly as before.
interface Note { id: string; day: string; text: string; byWorker: boolean }
const key = (farm: string): string => `tomorrow_notes:${farm}`;

export function TomorrowNotes({ byWorker = false, workerOnRealFarm = false }: { byWorker?: boolean; workerOnRealFarm?: boolean }) {
  const farm = activeFarm.value;
  const rows = useRows('day_notes');
  const [server, setServer] = useState<boolean | null>(null);
  const [local, setLocal] = useState<Note[]>([]); const [text, setText] = useState(''); const [bad, setBad] = useState(false);
  const load = async () => setLocal(((await db.settings.get(key(farm)))?.value as Note[] | undefined) ?? []);
  useEffect(() => { void serverNotesOn(db, workerOnRealFarm).then(setServer); void load(); }, [farm, workerOnRealFarm]);
  const today = athensToday(new Date()) ?? '';
  useEffect(() => {          // the first time on the server (owner): the notes typed on this phone move up once, then the phone copy is removed
    if (!server || workerOnRealFarm || local.length === 0) return;
    void (async () => {
      for (const n of local) { const r = buildDayNote({ day: n.day, text: n.text }, farm, new Date().toISOString(), n.id); if (r.ok) await put(db, 'day_notes', r.row, 'insert'); }
      await delLocal(db, key(farm)); setLocal([]); dataVersion.value++;
    })();
  }, [server, local.length, farm]);
  const add = async () => {
    if (text.trim() === '') { setBad(true); return; }
    setBad(false);
    if (server) {
      const r = buildDayNote({ day: nextDay(today), text }, farm, new Date().toISOString(), crypto.randomUUID());
      if (!r.ok) { setBad(true); return; }
      await put(db, 'day_notes', r.row, 'insert'); dataVersion.value++;
    } else { await putLocal(db, key(farm), [...local, { id: crypto.randomUUID(), day: nextDay(today), text: text.trim(), byWorker }]); await load(); }
    setText('');
  };
  const notes: Note[] = server
    ? (rows.rows ?? []).filter((r) => !r.deleted_at && r.status !== 'deleted' && typeof r.for_day === 'string' && typeof r.text === 'string').map((r) => ({ id: String(r.id), day: String(r.for_day), text: String(r.text), byWorker: typeof r.from_worker === 'boolean' ? r.from_worker : byWorker }))
    : local;
  const shown = notes.filter((n) => n.day >= today).sort((a, b) => a.day.localeCompare(b.day));
  if (server === null) return null;
  return (
    <section data-testid="notes">
      <h3>{t('ui.notes.title')}</h3>
      {shown.map((n) => <div class="card" key={n.id} data-testid="note"><span>{n.text}</span><small>{formatDate(n.day)}</small>{n.byWorker && <small><b data-testid="note-by-worker">{t('ui.notes.fromworker')}</b></small>}</div>)}
      <label class="field"><span class="ds-muted">{t('ui.notes.placeholder')}</span><input class="input" value={text} maxLength={280} autoComplete="off" data-testid="note-text" onInput={(e) => setText((e.target as HTMLInputElement).value)} /></label>
      {bad && <p class="msg error" role="alert" data-testid="note-error">{t('ui.notes.err')}</p>}
      <button class="btn" data-testid="note-add" onClick={() => void add()}>{t('ui.notes.add')}</button>
    </section>
  );
}
