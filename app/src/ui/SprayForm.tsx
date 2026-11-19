import { useState } from 'preact/hooks';
import { dataVersion, db, realFarmId } from '../db';
import { known } from '@aloni/rules-core';
import { t, type I18nKey } from '../i18n';
import { formatDose } from '../i18n/format';
import { DOSE_UNITS, readUse, statusOf } from '../labels/label-use';
import { putMany } from '../repo';
import { balanceOf, effectiveLots } from '../stock/stock';
import { athensToday } from '../plantings/planting';
import { exceedsMax, priorApps } from '../spray/apps';
import { doseOutsideLabel } from '../spray/spray';
import { parseDecimal } from '@aloni/rules-core';
import { buildSpray, isLate, type Flag, type SprayInput } from '../spray/spray';
import { athensInstant, athensLocalNow, instantOf } from '../spray/time';
import type { Row } from '../db/schema';
import { Lines, badgeText } from './LabelUses';
import { UNIT_KEYS } from './LabelUseForm';
import { BackBar } from './BackBar';
import { nameOf } from './screens';
import { useRows } from './useRows';

export const FLAG_KEYS: Record<Flag, I18nKey> = {
  label_none: 'spray.flag.label_none', label_blocked: 'spray.flag.label_blocked', label_unsigned: 'spray.flag.label_unsigned', label_changed: 'spray.flag.label_changed',
  dose_outside_label: 'spray.flag.dose_outside_label', dose_unit_differs: 'spray.flag.dose_unit_differs', lot_expired: 'spray.flag.lot_expired', stock_negative: 'spray.flag.stock_negative', max_apps_exceeded: 'spray.flag.max_apps_exceeded', late_entry: 'spray.flag.late_entry',
};
const RED: readonly Flag[] = ['label_none', 'label_blocked'];
const text = (v: unknown): string => (typeof v === 'string' ? v : '');
/** «YYYY-MM-DDTHH:mm» in the phone's own clock, for the date-time box. */

/**
 * Record a spray that happened. It is never refused because of the label: weak labels, a dose outside the range, an expired lot or negative stock are
 * shown as marks and saved on the record. The waiting period comes only from a signed label; otherwise it is unknown and the harvest stays blocked.
 */
export function SprayForm({ onDone }: { onDone: (saved: boolean) => void }) {
  const plantings = useRows('plantings'); const crops = useRows('crops'); const parcels = useRows('parcels'); const products = useRows('products');
  const labels = useRows('label_uses'); const sprays = useRows('job_spray'); const links = useRows('job_plantings'); const lots = useRows('stock_lots'); const moves = useRows('stock_movements'); const workers = useRows('workers');
  const live = (q: { rows: Row[] | null }) => q.rows?.filter((r) => !r.deleted_at) ?? [];
  const [sel, setSel] = useState<string[]>([]);
  const [productId, setProductId] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [when, setWhen] = useState(athensLocalNow(new Date()) ?? '');
  const [mixDraft] = useState(() => crypto.randomUUID()); const [inMix, setInMix] = useState(0);   // tank mix: the records saved so far with «+ another product»
  const [startWhen, setStartWhen] = useState(''); const [bbch, setBbch] = useState(''); const [prescription, setPrescription] = useState('');   // the start is REQUIRED and never pre-filled (a guess is not a record)
  const [dose, setDose] = useState('');
  const [unit, setUnit] = useState<(typeof DOSE_UNITS)[number] | undefined>(undefined);
  const [lotKey, setLotKey] = useState<string | undefined>(undefined);
  const [qty, setQty] = useState('');
  const [water, setWater] = useState('');
  const [note, setNote] = useState('');
  const [lateReason, setLateReason] = useState(''); const [overReason, setOverReason] = useState(''); const [doseReason, setDoseReason] = useState('');
  const [failed, setFailed] = useState(false);

  const chosen = live(plantings).filter((p) => sel.includes(p.id));
  const label = productId && chosen.length ? live(labels).find((l) => l.product_id === productId && l.crop_id === chosen[0].crop_id) : undefined;
  const product = live(products).find((p) => p.id === productId);
  const myLots = effectiveLots(lots.rows?.filter((l) => l.product_id === productId) ?? []);
  const lot = myLots.find((l) => l.lot_key === lotKey);
  const balance = lot ? balanceOf((moves.rows ?? []).filter((m) => m.lot_key === lotKey)) : undefined;
  const sprayedAt = athensInstant(when) ?? '';
  const input: SprayInput = { plantingIds: sel, productId, applicatorId: workerId, sprayedAt, startedAt: athensInstant(startWhen), bbch, prescription, mixId: inMix > 0 ? mixDraft : undefined, dose, doseUnit: unit, lotKey, qty, water, note, lateReason, overReason, doseReason };
  const prior = priorApps(sprays.rows ?? [], links.rows ?? [], sel, productId);
  const typedDose = parseDecimal(dose);
  const outside = typedDose.known && unit !== undefined && doseOutsideLabel(label, typedDose.value, unit); // the reason field appears only for a dose outside the label
  const over = exceedsMax(label, prior); // the reason field appears only when this spraying passes the signed label's maximum
  const late = sprayedAt !== '' && isLate(sprayedAt, new Date().toISOString()); // the reason field appears only for a late entry
  const ids = { job: crypto.randomUUID(), spray: crypto.randomUUID(), movement: crypto.randomUUID(), plantingLinks: sel.map(() => crypto.randomUUID()) };
  const sprayCtx = { priorApps: prior, label, plantings: chosen, lot, lotBalance: balance, today: athensToday(new Date()) ?? '' };
  const r = buildSpray(input, sprayCtx, realFarmId.value, new Date().toISOString(), ids);
  const rMix = buildSpray({ ...input, mixId: mixDraft }, sprayCtx, realFarmId.value, new Date().toISOString(), ids);   // the same record as the FIRST product of a tank mix
  const pickLabelDefaults = (l: Row | undefined) => { // the label's own unit (and a single dose) are offered as a start; nothing is chosen for him otherwise
    if (!l) return;
    const u = readUse(l);
    if (u.dose.known) { setUnit(u.dose.value.unit); if (u.dose.value.kind === 'single' && dose === '') setDose(formatDose(known(u.dose.value.min))); }
  };
  const plantingName = (p: Row) => t('spray.planting', { crop: nameOf(crops.rows?.find((c) => c.id === p.crop_id) ?? {}), parcel: String(parcels.rows?.find((x) => x.id === p.parcel_id)?.name ?? '') });
  const save = async (more: boolean) => {
    const rec = more ? rMix : r;
    if (!rec.ok) { setFailed(true); return; }
    await putMany(db, [
      { table: 'jobs', row: rec.job, op: 'insert' }, ...rec.jobPlantings.map((row) => ({ table: 'job_plantings', row, op: 'insert' as const })),
      { table: 'job_spray', row: rec.spray, op: 'insert' }, ...(rec.movement ? [{ table: 'stock_movements', row: rec.movement, op: 'insert' as const }] : []),
    ]);
    dataVersion.value++;
    if (!more) { onDone(true); return; }
    // tank mix: the plantings, the times and the applicator stay; the next product starts empty (its own label, dose, lot and waiting periods)
    setInMix(inMix + 1); setProductId(''); setDose(''); setUnit(undefined); setLotKey(undefined); setQty(''); setWater(''); setNote(''); setPrescription(''); setFailed(false);
  };
  const toggle = (id: string) => setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
  const unitText = text(product?.unit);
  const needs = live(plantings).length === 0 || live(products).length === 0 || live(workers).length === 0;

  return (
    <section class="detail">
      <header class="band">
        <BackBar onBack={() => onDone(false)} testId="spray-back" />
        <h1>{t('spray.add')}</h1>
      </header>
      {inMix > 0 && <p class="msg" role="status" data-testid="spray-mix-note">{t('spray.mix.note', { n: inMix })}</p>}
      {needs && <p class="msg error" role="alert" data-testid="spray-needs">{t('spray.needs')}</p>}
      <h2>{t('spray.plantings')}</h2>
      <div class="seg two">{live(plantings).map((p) => <button key={p.id} aria-pressed={sel.includes(p.id)} onClick={() => toggle(p.id)}>{plantingName(p)}</button>)}</div>
      <h2>{t('spray.product')}</h2>
      <div class="seg two">{live(products).map((p) => <button key={p.id} aria-pressed={productId === p.id} onClick={() => { setProductId(p.id); setLotKey(undefined); setQty(''); pickLabelDefaults(chosen.length ? live(labels).find((l) => l.product_id === p.id && l.crop_id === chosen[0].crop_id) : undefined); }}>{nameOf(p)}</button>)}</div>
      {productId && chosen.length > 0 && (
        <div class="card" data-testid="spray-label"><strong>{t('spray.label.title')}</strong>
          {label ? <><span class={`badge ${statusOf(label)}`}>{badgeText(label, statusOf(label))}</span><Lines row={label} /></> : <span class="badge blocked">{t('spray.flag.label_none')}</span>}
        </div>
      )}
      <h2>{t('spray.worker')}</h2>
      <div class="seg two">{live(workers).map((w) => <button key={w.id} aria-pressed={workerId === w.id} onClick={() => setWorkerId(w.id)}>{String(w.name)}</button>)}</div>
      <label class="field">{t('spray.start')}
        <input class="input" type="datetime-local" value={startWhen} data-testid="spray-start" onInput={(e) => setStartWhen((e.target as HTMLInputElement).value)} />
      </label>
      {failed && !r.ok && r.errors.start && <p class="msg error" role="alert" data-testid="spray-start-error">{t('spray.start.error')}</p>}
      <label class="field">{t('spray.time')}
        <input class="input" type="datetime-local" value={when} onInput={(e) => setWhen((e.target as HTMLInputElement).value)} />
      </label>
      {late && (
        <label class="field">{t('spray.late.reason')}
          <input class="input" value={lateReason} autoComplete="off" data-testid="spray-late-reason" onInput={(e) => setLateReason((e.target as HTMLInputElement).value)} />
        </label>
      )}
      {over && (
        <label class="field">{t('spray.over.reason')}
          <input class="input" value={overReason} autoComplete="off" data-testid="spray-over-reason" onInput={(e) => setOverReason((e.target as HTMLInputElement).value)} />
        </label>
      )}
      {outside && (
        <label class="field">{t('spray.dose.reason')}
          <input class="input" value={doseReason} autoComplete="off" data-testid="spray-dose-reason" onInput={(e) => setDoseReason((e.target as HTMLInputElement).value)} />
        </label>
      )}
      <label class="field">{t('spray.dose')}
        <input class="input" value={dose} inputMode="decimal" autoComplete="off" data-testid="spray-dose" onInput={(e) => setDose((e.target as HTMLInputElement).value)} />
      </label>
      <h2>{t('spray.unit')}</h2>
      <div class="seg two">{DOSE_UNITS.map((u) => <button key={u} aria-pressed={unit === u} onClick={() => setUnit(u)}>{t(UNIT_KEYS[u])}</button>)}</div>
      {productId && myLots.length > 0 && (
        <>
          <h2>{t('spray.lot')}</h2>
          <div class="seg two">{myLots.map((l) => <button key={l.id} aria-pressed={lotKey === l.lot_key} onClick={() => setLotKey(lotKey === l.lot_key ? undefined : String(l.lot_key))}>{text(l.batch) || text(l.expiry)}</button>)}</div>
        </>
      )}
      {lotKey && (
        <label class="field">{t('spray.qty', { unit: unitText })}
          <input class="input" value={qty} inputMode="decimal" autoComplete="off" data-testid="spray-qty" onInput={(e) => setQty((e.target as HTMLInputElement).value)} />
        </label>
      )}
      <label class="field">{t('spray.water')}
        <input class="input" value={water} inputMode="decimal" autoComplete="off" onInput={(e) => setWater((e.target as HTMLInputElement).value)} />
      </label>
      <label class="field">{t('spray.note')}
        <input class="input" value={note} autoComplete="off" onInput={(e) => setNote((e.target as HTMLInputElement).value)} />
      </label>
      {r.ok && r.flags.length > 0 && (
        <div class="card" data-testid="spray-flags">
          {r.flags.map((f) => <span key={f} class={RED.includes(f) ? 'badge blocked' : 'badge warn'}>{t(FLAG_KEYS[f])}</span>)}
          {r.spray.phi_until === undefined && <small>{t('spray.phi.unknown')}</small>}
        </div>
      )}
      {failed && !r.ok && <p class="msg error" role="alert" data-testid="spray-error">{t('spray.error.fill')}</p>}
      {failed && !r.ok && r.errors.dose && dose.trim() !== '' && <p class="msg error" role="alert">{t('spray.error.dose')}</p>}
      {failed && !r.ok && r.errors.mixedCrops && <p class="msg error" role="alert" data-testid="spray-mixed-error">{t('spray.error.mixed')}</p>}
      <label class="field">{t('spray.bbch')}<input class="input" value={bbch} inputMode="numeric" autoComplete="off" data-testid="spray-bbch" onInput={(e) => setBbch((e.target as HTMLInputElement).value)} /></label>
      {failed && !r.ok && r.errors.bbch && <p class="msg error" role="alert">{t('spray.bbch.error')}</p>}
      <label class="field">{t('spray.prescription')}<input class="input" value={prescription} autoComplete="off" data-testid="spray-prescription" onInput={(e) => setPrescription((e.target as HTMLInputElement).value)} /></label>
      {failed && !r.ok && r.errors.qty && <p class="msg error" role="alert">{t('spray.error.qty')}</p>}
      {failed && !r.ok && r.errors.lateReason && <p class="msg error" role="alert" data-testid="spray-late-error">{t('spray.late.error')}</p>}
      {failed && !r.ok && r.errors.overReason && <p class="msg error" role="alert" data-testid="spray-over-error">{t('spray.over.error')}</p>}
      {failed && !r.ok && r.errors.doseReason && <p class="msg error" role="alert" data-testid="spray-dose-error">{t('spray.dose.error')}</p>}
      {failed && !r.ok && r.errors.doseUnit && <p class="msg error" role="alert" data-testid="spray-unit-error">{t('spray.error.unit')}</p>}
      {failed && !r.ok && r.errors.water && <p class="msg error" role="alert">{t('spray.error.water')}</p>}
      <button class="btn" data-testid="spray-save" onClick={() => void save(false)}>{t('spray.save')}</button>
      <button class="btn secondary" data-testid="spray-save-mix" onClick={() => void save(true)}>{t('spray.mix.more')}</button>
      <button class="btn secondary" onClick={() => onDone(false)}>{t('product.cancel')}</button>
    </section>
  );
}
