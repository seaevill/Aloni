import { useEffect, useState } from 'preact/hooks';
import { dataVersion, db, realFarmId } from '../db';
import { addDecimal, known, mulDecimal, type Decimal } from '@aloni/rules-core';
import { t, type I18nKey } from '../i18n';
import { formatDose, formatQty } from '../i18n/format';
import { DOSE_UNITS, readUse, statusOf } from '../labels/label-use';
import { putMany } from '../repo';
import { balanceOf, effectiveLots } from '../stock/stock';
import { athensToday } from '../plantings/planting';
import { exceedsMax, priorApps } from '../spray/apps';
import { doseOutsideLabel } from '../spray/spray';
import { parseDecimal } from '@aloni/rules-core';
import { buildSpray, isLate, type Flag, type SprayInput } from '../spray/spray';
import { athensInstant, athensLocalNow, instantOf } from '../spray/time';
import { useSubmit } from './useSubmit';
import type { Row } from '../db/schema';
import { Lines, badgeText } from './LabelUses';
import { UNIT_KEYS } from './LabelUseForm';
import { BackBar } from './BackBar';
import { nameOf } from './screens';
import { useRows } from './useRows';

export const FLAG_KEYS: Record<Flag, I18nKey> = {
  label_none: 'spray.flag.label_none', label_blocked: 'spray.flag.label_blocked', label_unsigned: 'spray.flag.label_unsigned', label_changed: 'spray.flag.label_changed',
  dose_outside_label: 'spray.flag.dose_outside_label', dose_unit_differs: 'spray.flag.dose_unit_differs', lot_expired: 'spray.flag.lot_expired', stock_negative: 'spray.flag.stock_negative', max_apps_exceeded: 'spray.flag.max_apps_exceeded', quantity_unknown: 'spray.flag.quantity_unknown', late_entry: 'spray.flag.late_entry',
};
const RED: readonly Flag[] = ['label_none', 'label_blocked'];
const text = (v: unknown): string => (typeof v === 'string' ? v : '');
/** «YYYY-MM-DDTHH:mm» in the phone's own clock, for the date-time box. */

/**
 * Record a spray that happened. It is never refused because of the label: weak labels, a dose outside the range, an expired lot or negative stock are
 * shown as marks and saved on the record. The waiting period comes only from a signed label; otherwise it is unknown and the harvest stays blocked.
 */
export function SprayForm({ onDone }: { onDone: (saved: boolean) => void }) {
  const { busy, submit } = useSubmit();
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
  const [qty, setQty] = useState(''); const [qtyUnknown, setQtyUnknown] = useState(false);
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
  const input: SprayInput = { plantingIds: sel, productId, applicatorId: workerId, sprayedAt, startedAt: athensInstant(startWhen), bbch, prescription, mixId: inMix > 0 ? mixDraft : undefined, dose, doseUnit: unit, lotKey, qty, qtyUnknown, water, note, lateReason, overReason, doseReason };
  const prior = priorApps(sprays.rows ?? [], links.rows ?? [], sel, productId);
  const typedDose = parseDecimal(dose);
  const outside = typedDose.known && unit !== undefined && doseOutsideLabel(label, typedDose.value, unit); // the reason field appears only for a dose outside the label
  const over = exceedsMax(label, prior); // the reason field appears only when this spraying passes the signed label's maximum
  const late = sprayedAt !== '' && isLate(sprayedAt, new Date().toISOString()); // the reason field appears only for a late entry
  const ids = { job: crypto.randomUUID(), spray: crypto.randomUUID(), movement: crypto.randomUUID(), plantingLinks: sel.map(() => crypto.randomUUID()) };
  const sprayCtx = { priorApps: prior, label, plantings: chosen, lot, lotBalance: balance, today: athensToday(new Date()) ?? '' };
  const r = buildSpray(input, sprayCtx, realFarmId.value, new Date().toISOString(), ids);
  const rMix = buildSpray({ ...input, mixId: mixDraft }, sprayCtx, realFarmId.value, new Date().toISOString(), ids);   // the same record as the FIRST product of a tank mix
  const pickLabelDefaults = (_l: Row | undefined) => undefined;   // NOTHING is filled in for the owner: the label's dose is shown beside the field and a tap on «Ίδια με την ετικέτα» copies it (T6)
  const lu = label ? readUse(label) : undefined;
  const labelDose = lu && lu.dose.known ? { min: formatDose(known(lu.dose.value.min)), max: formatDose(known(lu.dose.value.max)), single: lu.dose.value.kind === 'single', unit: lu.dose.value.unit } : undefined;
  const perStr = unit !== undefined && /^(ml|g|l|kg)\/str$/.test(unit) ? unit.split('/')[0] : undefined;
  const areasKnown = chosen.every((p) => parseDecimal(String(p.area_str ?? '')).known);      // a total for only part of the area would mislead: no hint then
  const area = !areasKnown ? undefined : chosen.reduce<Decimal | undefined>((sum, p) => { const a = parseDecimal(String(p.area_str ?? '')); return a.known ? (sum === undefined ? a.value : (addDecimal(sum, a.value) as Decimal)) : sum; }, undefined);
  const totalHint = perStr && typedDose.known && area !== undefined ? { area: String(area), dose: String(typedDose.value), u: perStr, total: mulDecimal(area, typedDose.value) } : undefined;   // text only, exact decimals: never written into a field
  const today0 = athensToday(new Date()) ?? '';
  const freshLots = myLots.filter((l) => !(typeof l.expiry === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(l.expiry) && l.expiry < today0));   // not expired (an unreadable or missing expiry is not «expired»)
  useEffect(() => { if (productId && lotKey === undefined && freshLots.length === 1) setLotKey(String(freshLots[0]!.lot_key)); }, [productId, myLots.length]);   // only when there is exactly ONE lot that is not expired
  const focusFirstError = () => { requestAnimationFrame(() => { const el = document.querySelector<HTMLElement>('.msg.error[role="alert"]'); if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); } }); };
  const plantingName = (p: Row) => t('spray.planting', { crop: nameOf(crops.rows?.find((c) => c.id === p.crop_id) ?? {}), parcel: String(parcels.rows?.find((x) => x.id === p.parcel_id)?.name ?? '') });
  const save = async (more: boolean) => {
    const rec = more ? rMix : r;
    if (!rec.ok) { setFailed(true); focusFirstError(); return; }
    await putMany(db, [
      { table: 'jobs', row: rec.job, op: 'insert' }, ...rec.jobPlantings.map((row) => ({ table: 'job_plantings', row, op: 'insert' as const })),
      { table: 'job_spray', row: rec.spray, op: 'insert' }, ...(rec.movement ? [{ table: 'stock_movements', row: rec.movement, op: 'insert' as const }] : []),
    ]);
    dataVersion.value++;
    if (!more) { onDone(true); return; }
    // tank mix: the plantings, the times and the applicator stay; the next product starts empty (its own label, dose, lot and waiting periods)
    setInMix(inMix + 1); setProductId(''); setDose(''); setUnit(undefined); setLotKey(undefined); setQty(''); setQtyUnknown(false); setWater(''); setNote(''); setPrescription(''); setFailed(false);
  };
  const toggle = (id: string) => setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
  const unitText = text(product?.unit);
  const needs = live(plantings).length === 0 || live(products).length === 0 || live(workers).length === 0;

  return (
    <section class="detail">
      <header class="band">
        <BackBar onBack={() => onDone(false)} testId="spray-back" />
        <h1 tabIndex={-1}>{t('spray.add')}</h1>
      </header>
      {inMix > 0 && <p class="msg" role="status" data-testid="spray-mix-note">{t('spray.mix.note', { n: inMix })}</p>}
      {needs && <p class="msg error" role="alert" tabIndex={-1} data-testid="spray-needs">{t('spray.needs')}</p>}
      <h2>{t('spray.plantings')}</h2>
      <div class="seg two">{live(plantings).map((p) => <button key={p.id} aria-pressed={sel.includes(p.id)} disabled={chosen.length > 0 && !sel.includes(p.id) && p.crop_id !== chosen[0]?.crop_id} onClick={() => toggle(p.id)}>{plantingName(p)}</button>)}</div>
      {chosen.length > 0 && <p class="muted" data-testid="spray-onecrop">{t('spray.oneCrop')}</p>}
      <h2>{t('spray.product')}</h2>
      <div class="seg two">{live(products).map((p) => <button key={p.id} aria-pressed={productId === p.id} onClick={() => { setProductId(p.id); setLotKey(undefined); setQty(''); setQtyUnknown(false); pickLabelDefaults(chosen.length ? live(labels).find((l) => l.product_id === p.id && l.crop_id === chosen[0].crop_id) : undefined); }}>{nameOf(p)}</button>)}</div>
      {product && !text(product.reg_no) && <p class="badge warn bi" role="note" data-testid="spray-noreg">{t('product.noreg')}</p>}
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
      {failed && !r.ok && r.errors.start && <p class="msg error" role="alert" tabIndex={-1} data-testid="spray-start-error">{t('spray.start.error')}</p>}
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
      {labelDose && (
        <p class="muted" data-testid="spray-label-dose">{labelDose.single ? t('spray.label.dose', { v: labelDose.min, unit: t(UNIT_KEYS[labelDose.unit]) }) : t('spray.label.range', { a: labelDose.min, b: labelDose.max, unit: t(UNIT_KEYS[labelDose.unit]) })}</p>
      )}
      {labelDose?.single && <button class="btn secondary" data-testid="spray-dose-same" onClick={() => { setDose(labelDose.min); setUnit(labelDose.unit); }}>{t('spray.label.same')}</button>}
      <label class="field">{t('spray.dose')}
        <input class="input" value={dose} inputMode="decimal" autoComplete="off" data-testid="spray-dose" onInput={(e) => setDose((e.target as HTMLInputElement).value)} />
      </label>
      {totalHint && <p class="muted" data-testid="spray-total-hint">{t('spray.hint.total', { area: formatQty(totalHint.area), dose: formatQty(totalHint.dose), u: totalHint.u, total: formatQty(totalHint.total) })}</p>}
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
          <input class="input" value={qty} inputMode="decimal" autoComplete="off" disabled={qtyUnknown} data-testid="spray-qty" onInput={(e) => setQty((e.target as HTMLInputElement).value)} />
        </label>
      )}
      {lotKey && <label class="field check"><input type="checkbox" checked={qtyUnknown} data-testid="spray-qty-unknown" onChange={(e) => { const on = (e.target as HTMLInputElement).checked; setQtyUnknown(on); if (on) setQty(''); }} />{t('spray.qty.unknown')}</label>}
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
      {failed && !r.ok && (r.errors.plantings || r.errors.product || r.errors.applicator) && <p class="msg error" role="alert" tabIndex={-1} data-testid="spray-error">{t('spray.error.fill')}</p>}
      {failed && !r.ok && r.errors.dose && dose.trim() !== '' && <p class="msg error" role="alert" tabIndex={-1}>{t('spray.error.dose')}</p>}
      {failed && !r.ok && r.errors.mixedCrops && <p class="msg error" role="alert" tabIndex={-1} data-testid="spray-mixed-error">{t('spray.error.mixed')}</p>}
      <label class="field">{t('spray.bbch')}<input class="input" value={bbch} inputMode="numeric" autoComplete="off" data-testid="spray-bbch" onInput={(e) => setBbch((e.target as HTMLInputElement).value)} /></label>
      {failed && !r.ok && r.errors.bbch && <p class="msg error" role="alert" tabIndex={-1}>{t('spray.bbch.error')}</p>}
      <label class="field">{t('spray.prescription')}<input class="input" value={prescription} autoComplete="off" data-testid="spray-prescription" onInput={(e) => setPrescription((e.target as HTMLInputElement).value)} /></label>
      {failed && !r.ok && r.errors.qty && <p class="msg error" role="alert" tabIndex={-1}>{t('spray.error.qty')}</p>}
      {failed && !r.ok && r.errors.lateReason && <p class="msg error" role="alert" tabIndex={-1} data-testid="spray-late-error">{t('spray.late.error')}</p>}
      {failed && !r.ok && r.errors.overReason && <p class="msg error" role="alert" tabIndex={-1} data-testid="spray-over-error">{t('spray.over.error')}</p>}
      {failed && !r.ok && r.errors.doseReason && <p class="msg error" role="alert" tabIndex={-1} data-testid="spray-dose-error">{t('spray.dose.error')}</p>}
      {failed && !r.ok && r.errors.doseUnit && <p class="msg error" role="alert" tabIndex={-1} data-testid="spray-unit-error">{t('spray.error.unit')}</p>}
      {failed && !r.ok && r.errors.water && <p class="msg error" role="alert" tabIndex={-1}>{t('spray.error.water')}</p>}
      <button class="btn" data-testid="spray-save" onClick={() => void submit(() => save(false))} disabled={busy}>{t('spray.save')}</button>
      <button class="btn secondary" data-testid="spray-save-mix" onClick={() => void submit(() => save(true))} disabled={busy}>{t('spray.mix.more')}</button>
      <button class="btn secondary" onClick={() => onDone(false)}>{t('product.cancel')}</button>
    </section>
  );
}
