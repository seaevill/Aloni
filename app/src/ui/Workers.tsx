import { openSheet } from './nav';
import './InviteSheet';
import { useEffect, useState } from 'preact/hooks';
import { AUTH_ENABLED, BACKEND } from '../config';
import { invite, openInvitations, session, tokenFor, withdrawInvitation, type OpenInvitation } from '../auth/gotrue';
import { saveSession } from '../auth/store';
import { canInviteWorkers, loadController, type Controller } from '../legal/controller';
import { activeFarm, dataVersion, db, realFarmId } from '../db';
import { t } from '../i18n';
import { archived, restored } from '../parcels/parcel';
import { put } from '../repo';
import { buildWorker } from '../workers/worker';
import { useSubmit } from './useSubmit';
import type { Row } from '../db/schema';
import { showUndo } from './Toast';
import { useRows } from './useRows';
import { BackBar } from './BackBar';
import './WorkerCard';

/** More → Εργάτες: the roster used to say who sprayed. A name only. Add, archive with 5 s undo; real farm only. */
/** The invitation of one roster worker: only with a live sign-in AND the data controller's details entered (the same gate the server keeps). */
function Invite({ worker, controller }: { worker: Row; controller: Controller | undefined }) {
  const [email, setEmail] = useState(''); const [state, setState] = useState<'idle' | 'sent' | 'failed'>('idle');
  const [open, setOpen] = useState<OpenInvitation[]>([]); const [round, setRound] = useState(0);
  const allowed = AUTH_ENABLED && !!session.value && canInviteWorkers(controller).allowed;
  useEffect(() => {
    if (!allowed) return;
    void tokenFor(BACKEND, session.value, Date.now(), saveSession).then(async (token) => { if (token) setOpen((await openInvitations(BACKEND, token, realFarmId.value)).filter((i) => i.worker_id === worker.id)); });
  }, [allowed, round]);
  if (!AUTH_ENABLED || !session.value) return null;
  if (!canInviteWorkers(controller).allowed) return <p class="muted" data-testid="invite-closed">{t('invite.closed')}</p>;
  const send = async () => {
    try {
      const token = await tokenFor(BACKEND, session.value, Date.now(), saveSession);
      if (!token) throw new Error('not signed in');
      await invite(BACKEND, token, realFarmId.value, email, worker.id); setState('sent'); setEmail(''); setRound((n) => n + 1);
    } catch { setState('failed'); }
  };
  return (
    <>
      <strong>{t('invite.title')}</strong>
      {open.map((i) => (
        <p class="muted" key={i.id} data-testid="invite-open">{t('invite.openLine', { email: i.email })}
          <button class="btn secondary" data-testid="invite-withdraw" onClick={() => void tokenFor(BACKEND, session.value, Date.now(), saveSession).then(async (token) => { if (token) { await withdrawInvitation(BACKEND, token, i.id); setRound((n) => n + 1); } })}>{t('invite.withdraw')}</button>
        </p>
      ))}
      <label class="field">{t('invite.email')}<input class="input" type="email" value={email} autoComplete="off" onInput={(e) => setEmail((e.target as HTMLInputElement).value)} /></label>
      <button class="btn secondary" data-testid="invite-send" onClick={() => void send()}>{t('invite.send')}</button>
      <button type="button" class="btn secondary" data-testid="invite-qr-open" onClick={() => openSheet('invite', String(worker.id))}>{t('ui.invite.open')}</button>
      {state === 'sent' && <p class="msg" role="status">{t('invite.sent')}</p>}
      {state === 'failed' && <p class="msg error" role="alert">{t('invite.error')}</p>}
    </>
  );
}

export function Workers({ onBack }: { onBack: () => void }) {
  const { busy, submit } = useSubmit();
  const [controller, setController] = useState<Controller | undefined>(undefined);
  useEffect(() => { if (AUTH_ENABLED) void loadController(db).then(setController); }, []);
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
      <BackBar onBack={onBack} />
      <h1 tabIndex={-1}>{t('workers.title')}</h1>
      <p class="muted">{t('workers.note')}</p>
      {demo && <p class="muted" data-testid="workers-demo">{t('workers.demo')}</p>}
      {!demo && (
        <>
          <label class="field">{t('workers.name')}
            <input class="input" value={name} autoComplete="off" data-testid="worker-name" onInput={(e) => setName((e.target as HTMLInputElement).value)} />
          </label>
          {bad && <p class="msg error" role="alert">{t('workers.error.name')}</p>}
          <button class="btn" data-testid="worker-add" onClick={() => void submit(add)} disabled={busy}>{t('workers.add')}</button>
        </>
      )}
      {q.rows && live.length === 0 && <p class="muted" data-testid="workers-empty">{t('workers.empty')}</p>}
      {live.map((w) => (
        <div class="card" key={w.id} data-testid="worker"><button type="button" class="row" data-testid="worker-open" aria-label={t('ui.wcard.open')} onClick={() => openSheet('worker', String(w.id))}><strong>{String(w.name)}</strong><span aria-hidden="true" class="chev" /></button>
          {!demo && <Invite worker={w} controller={controller} />}
          {!demo && <button class="btn quiet" onClick={() => void archive(w)}>{t('product.archive')}</button>}
        </div>
      ))}
    </section>
  );
}
