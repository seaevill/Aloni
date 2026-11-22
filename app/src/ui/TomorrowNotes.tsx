import { useEffect, useState } from 'preact/hooks';
import { activeFarm, db } from '../db';
import { formatDate, t } from '../i18n';
import { nextDay } from '../orders/tomorrow';
import { athensToday } from '../plantings/planting';
import { putLocal } from '../repo';

// Εργασίες → notes for the next days («＋ Σημείωση για αύριο»). The owner and the worker of the SAME phone (the Demo practice view, or a shared farm phone) write and read them; a note a worker wrote is tagged «από εργάτη».
// Kept on this phone per farm: sharing notes between phones needs a server table (B3), so this is not promised for separate phones.
interface Note { id: string; day: string; text: string; byWorker: boolean }
const key = (farm: string): string => `tomorrow_notes:${farm}`;

export function TomorrowNotes({ byWorker = false }: { byWorker?: boolean }) {
  const farm = activeFarm.value;
  const [notes, setNotes] = useState<Note[]>([]); const [text, setText] = useState(''); const [bad, setBad] = useState(false);
  const load = async () => setNotes(((await db.settings.get(key(farm)))?.value as Note[] | undefined) ?? []);
  useEffect(() => { void load(); }, [farm]);
  const today = athensToday(new Date()) ?? '';
  const add = async () => {
    if (text.trim() === '') { setBad(true); return; }
    setBad(false);
    await putLocal(db, key(farm), [...notes, { id: crypto.randomUUID(), day: nextDay(today), text: text.trim(), byWorker }]);
    setText(''); await load();
  };
  const shown = notes.filter((n) => n.day >= today).sort((a, b) => a.day.localeCompare(b.day));
  return (
    <section data-testid="notes">
      <h3>{t('ui.notes.title')}</h3>
      {shown.map((n) => <div class="card" key={n.id} data-testid="note"><span>{n.text}</span><small>{formatDate(n.day)}</small>{n.byWorker && <small><b data-testid="note-by-worker">{t('ui.notes.fromworker')}</b></small>}</div>)}
      <label class="field"><span class="ds-muted">{t('ui.notes.placeholder')}</span><input class="input" value={text} autoComplete="off" data-testid="note-text" onInput={(e) => setText((e.target as HTMLInputElement).value)} /></label>
      {bad && <p class="msg error" role="alert" data-testid="note-error">{t('ui.notes.err')}</p>}
      <button class="btn" data-testid="note-add" onClick={() => void add()}>{t('ui.notes.add')}</button>
    </section>
  );
}
