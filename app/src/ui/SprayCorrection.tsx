import { useState } from 'preact/hooks';
import { dataVersion, db, realFarmId } from '../db';
import { t } from '../i18n';
import { DOSE_UNITS } from '../labels/label-use';
import { putMany } from '../repo';
import { buildCorrection } from '../spray/spray';
import { athensInstant, athensLocalNow } from '../spray/time';
import { balanceOf } from '../stock/stock';
import type { Row } from '../db/schema';
import { UNIT_KEYS } from './LabelUseForm';
import { nameOf } from './screens';
import { useRows } from './useRows';

const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const comma = (v: unknown): string => text(v).split('.').join(',');

/** «Διόρθωση»: every field of a recorded spraying can be corrected. The original stays; the correction is a NEW row with a required reason; a changed quantity moves the stock. */
export function SprayCorrection({ spray, onDone }: { spray: Row; onDone: () => void }) {
  const workers = useRows('workers'); const moves = useRows('stock_movements');
  const [dose, setDose] = useState(comma(spray.dose_str)); const [unit, setUnit] = useState(DOSE_UNITS.find((u) => u === spray.dose_unit));
  const [when, setWhen] = useState(athensLocalNow(new Date(text(spray.sprayed_at))) ?? ''); const [who, setWho] = useState(text(spray.applicator_id));
  const [qty, setQty] = useState(comma(spray.qty_str)); const [water, setWater] = useState(comma(spray.water_l)); const [note, setNote] = useState(text(spray.note));
  const [why, setWhy] = useState(''); const [failed, setFailed] = useState(false);
  const hasLot = typeof spray.lot_key === 'string' && typeof spray.qty_str === 'string';
  const lotMoves = (moves.rows ?? []).filter((m) => m.lot_key === spray.lot_key);
  const r = buildCorrection(spray, { dose, doseUnit: unit, sprayedAt: athensInstant(when) ?? '', applicatorId: who, qty, water, note, reason: why },
    { movements: moves.rows ?? [], lotBalance: hasLot ? balanceOf(lotMoves) : undefined }, realFarmId.value, new Date().toISOString(),
    { spray: crypto.randomUUID(), moveIn: crypto.randomUUID(), moveOut: crypto.randomUUID() });
  const save = async () => {
    if (!r.ok) { setFailed(true); return; }
    await putMany(db, [{ table: 'job_spray', row: r.spray, op: 'insert' }, ...r.movements.map((row) => ({ table: 'stock_movements', row, op: 'insert' as const }))]); // the correction and its stock movement, ONE transaction
    dataVersion.value++;
    onDone();
  };
  const e = !r.ok && failed ? r.errors : undefined;
  return (
    <div class="card" data-testid="spray-correction">
      <h2>{t('spray.correct.title')}</h2>
      <p class="muted">{t('spray.correct.note')}</p>
      <label class="field">{t('spray.dose')}<span class="inbox"><input class="input" value={dose} inputMode="decimal" autoComplete="off" data-testid="corr-dose" onInput={(ev) => setDose((ev.target as HTMLInputElement).value)} /></span></label>
      {e?.dose && <p class="msg error" role="alert">{t('spray.error.dose')}</p>}
      <div class="seg two">{DOSE_UNITS.map((u) => <button key={u} aria-pressed={unit === u} onClick={() => setUnit(u)}>{t(UNIT_KEYS[u])}</button>)}</div>
      {e?.doseUnit && <p class="msg error" role="alert">{t('spray.error.unit')}</p>}
      <label class="field">{t('spray.time')}<input class="input" type="datetime-local" value={when} data-testid="corr-time" onInput={(ev) => setWhen((ev.target as HTMLInputElement).value)} /></label>
      {e?.time && <p class="msg error" role="alert">{t('spray.correct.time.error')}</p>}
      {e?.earlier && <p class="msg error" role="alert" data-testid="corr-earlier">{t('spray.correct.earlier')}</p>}
      <div class="seg two">{(workers.rows ?? []).filter((w) => !w.deleted_at).map((w) => <button key={String(w.id)} aria-pressed={who === w.id} onClick={() => setWho(String(w.id))}>{nameOf(w)}</button>)}</div>
      {hasLot && <label class="field">{t('spray.correct.qty')}<input class="input" value={qty} inputMode="decimal" autoComplete="off" data-testid="corr-qty" onInput={(ev) => setQty((ev.target as HTMLInputElement).value)} /></label>}
      {e?.qty && <p class="msg error" role="alert">{t('spray.error.qty')}</p>}
      <label class="field">{t('spray.water')}<input class="input" value={water} inputMode="decimal" autoComplete="off" onInput={(ev) => setWater((ev.target as HTMLInputElement).value)} /></label>
      {e?.water && <p class="msg error" role="alert">{t('spray.error.water')}</p>}
      <label class="field">{t('spray.note')}<input class="input" value={note} autoComplete="off" onInput={(ev) => setNote((ev.target as HTMLInputElement).value)} /></label>
      <label class="field">{t('spray.correct.reason')}<input class="input" value={why} autoComplete="off" data-testid="corr-reason" onInput={(ev) => setWhy((ev.target as HTMLInputElement).value)} /></label>
      {e?.reason && <p class="msg error" role="alert" data-testid="corr-reason-error">{t('spray.correct.reason.error')}</p>}
      <button class="btn" data-testid="corr-save" onClick={() => void save()}>{t('product.save')}</button>
      <button class="btn secondary" onClick={onDone}>{t('product.cancel')}</button>
    </div>
  );
}
