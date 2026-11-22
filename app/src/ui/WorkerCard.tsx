import { useEffect, useState } from 'preact/hooks';
import { activeFarm, db } from '../db';
import { t } from '../i18n';
import { put, putLocal } from '../repo';
import { serverRecordsOn } from '../owner-records/mode';
import { moveLocalOwnerRecords } from '../owner-records/migrate';
import { buildWorkerCard } from '../owner-records/records';
import { DetailSheet } from './ds';
import { nameOf } from './screens';
import { registerSheet, type SheetProps } from './sheets';
import { useRows } from './useRows';

// Εργάτες → a name opens the worker's card: name, surname, phone. NO birth date (Bora's decision, 2026-11-21). Owner only (the worker screens have no way to open it), kept on this phone per farm; the server table is the owner-only one of 0037.
interface Card { surname: string; phone: string }
const key = (farm: string, id: string): string => `worker_card:${farm}:${id}`;

function WorkerCardSheet({ id, close }: SheetProps) {
  const workers = useRows('workers');
  const farm = activeFarm.value;
  const [card, setCard] = useState<Card | undefined>(undefined);
  const [saved, setSaved] = useState(false);
  const [server, setServer] = useState(false);
  const cards = useRows('worker_cards');
  useEffect(() => {
    void (async () => {
      const on = await serverRecordsOn(db); setServer(on);
      if (on) await moveLocalOwnerRecords(db, farm);                       // once: the card typed on this phone goes to the server table
      if (!on) setCard(((await db.settings.get(key(farm, id)))?.value as Card | undefined) ?? { surname: '', phone: '' });
    })();
  }, [farm, id]);
  const serverCard = (cards.rows ?? []).find((c) => c.worker_id === id && !c.deleted_at);
  useEffect(() => { if (server && cards.rows) setCard({ surname: String(serverCard?.surname ?? ''), phone: String(serverCard?.phone ?? '') }); }, [server, cards.rows, id]);
  const worker = (workers.rows ?? []).find((w) => w.id === id);
  if (!workers.rows || !card) return null;
  if (!worker) return <DetailSheet heading={t('ui.sheet.notfound.head')} onClose={close} testid="sheet-notfound"><p class="ds-muted">{t('ui.sheet.notfound.body')}</p></DetailSheet>;
  const save = async () => {
    if (server) {
      const now = new Date().toISOString();
      if (serverCard) await put(db, 'worker_cards', { ...serverCard, surname: card.surname.trim() === '' ? null : card.surname.trim(), phone: card.phone.trim() === '' ? null : card.phone.trim(), updated_at: now }, 'update');
      else { const r = buildWorkerCard({ workerId: id, surname: card.surname, phone: card.phone }, farm, now, crypto.randomUUID()); if (r.ok) await put(db, 'worker_cards', r.row, 'insert'); }
    } else await putLocal(db, key(farm, id), { surname: card.surname.trim(), phone: card.phone.trim() });
    setSaved(true);
  };
  return (
    <DetailSheet heading={nameOf(worker)} onClose={close} testid="worker-card">
      <label class="field">{t('ui.wcard.surname')}<input class="input" value={card.surname} autoComplete="off" data-testid="wcard-surname" onInput={(e) => { setSaved(false); setCard({ ...card, surname: (e.target as HTMLInputElement).value }); }} /></label>
      <label class="field">{t('ui.wcard.phone')}<input class="input" type="tel" value={card.phone} autoComplete="off" data-testid="wcard-phone" onInput={(e) => { setSaved(false); setCard({ ...card, phone: (e.target as HTMLInputElement).value }); }} /></label>
      <button class="btn" data-testid="wcard-save" onClick={() => void save()}>{t('ui.wcard.save')}</button>
      {saved && <p class="msg" role="status" data-testid="wcard-saved">{t('ui.wcard.saved')}</p>}
      {!server && <p class="muted">{t('ui.wcard.local')}</p>}
    </DetailSheet>
  );
}
registerSheet('worker', WorkerCardSheet);
