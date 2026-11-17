import { useState } from 'preact/hooks';
import { activeFarm, dataVersion, db, realFarmId } from '../db';
import { t } from '../i18n';
import { archived, restored } from '../parcels/parcel';
import { put } from '../repo';
import { buildWorker } from '../workers/worker';
import type { Row } from '../db/schema';
import { showUndo } from './Toast';
import { useRows } from './useRows';

/** More → Εργάτες: the roster used to say who sprayed. A name only. Add, archive with 5 s undo; real farm only. */
export function Workers({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('');
  const [bad, setBad] = useState(false);
  const q = useRows('workers');
  const demo = activeFarm.value !== realFarmId.value;
  const live = q.rows?.filter((w) => !w.deleted_at) ?? [];
  const add = async () => {
    const r = buildWorker(name, realFarmId.value, new Date().toISOString(), crypto.randomUUID());
    if (!r.ok) { setBad(true); return; }
    await put(db, 'workers', r.row, 'insert');
    dataVersion.value++;
    setName(''); setBad(false);
    showUndo(t('workers.saved'), async () => { await put(db, 'workers', archived(r.row, new Date().toISOString())); dataVersion.value++; });
  };
  const archive = async (w: Row) => {
    await put(db, 'workers', archived(w, new Date().toISOString()));
    dataVersion.value++;
    showUndo(t('workers.archived'), async () => { await put(db, 'workers', restored(w, new Date().toISOString())); dataVersion.value++; });
  };
  return (
    <section>
      <h1>{t('workers.title')}</h1>
      <button class="btn secondary" onClick={onBack}>{t('info.back')}</button>
      <p class="muted">{t('workers.note')}</p>
      {demo ? <p class="muted" data-testid="workers-demo">{t('workers.demo')}</p> : (
        <>
          <label class="field">{t('workers.name')}
            <input class="input" value={name} autoComplete="off" data-testid="worker-name" onInput={(e) => setName((e.target as HTMLInputElement).value)} />
          </label>
          {bad && <p class="msg error" role="alert">{t('workers.error.name')}</p>}
          <button class="btn" data-testid="worker-add" onClick={() => void add()}>{t('workers.add')}</button>
          {q.rows && live.length === 0 && <p class="muted" data-testid="workers-empty">{t('workers.empty')}</p>}
          {live.map((w) => (
            <div class="card" key={w.id} data-testid="worker">{String(w.name)}
              <button class="btn secondary" onClick={() => void archive(w)}>{t('product.archive')}</button>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
