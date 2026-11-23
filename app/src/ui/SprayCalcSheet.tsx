import { useEffect, useState } from 'preact/hooks';
import { activeFarm, db } from '../db';
import { t, type I18nKey } from '../i18n';
import { formatArea, formatQty } from '../i18n/format';
import { putLocal } from '../repo';
import { sprayCalc, type Amount, type DoseLine } from '../spraycalc/spraycalc';
import type { Row } from '../db/schema';
import { DetailSheet } from './ds';
import { nameOf } from './screens';
import { registerSheet, type SheetProps } from './sheets';
import { useRows } from './useRows';
import './spray-calc.css';
import { NoteTip } from './NoteTip';

// Προϊόν › «Υπολογισμός ψεκαστικού»: the dose of a SIGNED label × the area, exactly, in the label's own unit. No signed label = no number. The app chooses no product, no dose and no water rate:
// the water (litres per στρέμμα) and the tank volume are typed by the grower and kept on this phone. Information only.
const key = (farm: string): string => `spray_calc:${farm}`;
const text = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
const WHICH: Record<DoseLine['which'], I18nKey> = { single: 'ui.scalc.dose.single', min: 'ui.scalc.dose.min', max: 'ui.scalc.dose.max' };
const amountText = (a: Amount): string => (a.known ? t('ui.scalc.amount', { n: formatQty(a.amount), unit: a.unit }) : t('ui.scalc.unknown.water'));

function SprayCalcSheet({ id, close }: SheetProps) {
  const farm = activeFarm.value;
  const products = useRows('products'); const labels = useRows('label_uses'); const crops = useRows('crops'); const plantings = useRows('plantings'); const parcels = useRows('parcels');
  const [cropId, setCropId] = useState(''); const [plantingId, setPlantingId] = useState(''); const [area, setArea] = useState('');
  const [tank, setTank] = useState(''); const [water, setWater] = useState('');
  useEffect(() => { void (async () => { const v = (await db.settings.get(key(farm)))?.value as { tank?: string; water?: string } | undefined; setTank(v?.tank ?? ''); setWater(v?.water ?? ''); })(); }, [farm]);
  useEffect(() => { void putLocal(db, key(farm), { tank, water }); }, [farm, tank, water]);
  const product = (products.rows ?? []).find((p) => p.id === id);
  if (!products.rows || !labels.rows) return null;
  if (!product) return <DetailSheet heading={t('ui.sheet.notfound.head')} onClose={close} testid="sheet-notfound"><p class="ds-muted">{t('ui.sheet.notfound.body')}</p></DetailSheet>;
  const uses = labels.rows.filter((l) => l.product_id === id && !l.deleted_at);
  const cropIds = [...new Set(uses.map((l) => text(l.crop_id)))];
  const chosenCrop = cropId !== '' && cropIds.includes(cropId) ? cropId : (cropIds[0] ?? '');
  const mine = (plantings.rows ?? []).filter((p) => p.crop_id === chosenCrop && !p.deleted_at);
  const chosenPlanting = mine.find((p) => p.id === plantingId) ?? mine[0];
  const areaStr = area.trim() !== '' ? area.trim() : text(chosenPlanting?.area_str);
  const use = uses.find((l) => l.crop_id === chosenCrop);
  const calc = use ? sprayCalc(use, areaStr, tank.trim() === '' ? undefined : tank, water.trim() === '' ? undefined : water) : undefined;
  const cropRow = (cid: string): Row | undefined => (crops.rows ?? []).find((c) => c.id === cid);
  const parcelName = (p: Row): string => nameOf((parcels.rows ?? []).find((x) => x.id === p.parcel_id) ?? {}) || t('ui.unknown');
  const blocked = calc === undefined ? t('ui.scalc.nolabel') : calc.ok ? undefined : t(calc.reason === 'unsigned' ? 'ui.scalc.unsigned' : 'ui.scalc.noarea');
  return (
    <DetailSheet heading={t('ui.scalc.title')} onClose={close} testid="spray-calc">
      <p><strong>{nameOf(product)}</strong></p>
      {cropIds.length === 0 && <p class="ds-muted" data-testid="scalc-nolabel">{t('ui.scalc.nolabel')}</p>}
      {cropIds.length > 0 && <>
        <div class="chips" role="group" aria-label={t('ui.scalc.crop')}>
          {cropIds.map((cid) => <button key={cid} type="button" class="tag-btn" aria-pressed={chosenCrop === cid} data-testid="scalc-crop" onClick={() => { setCropId(cid); setPlantingId(''); }}>{nameOf(cropRow(cid) ?? {})}</button>)}
        </div>
        {mine.length > 0 && <div class="chips" role="group" aria-label={t('ui.scalc.planting')}>
          {mine.map((p) => <button key={String(p.id)} type="button" class="tag-btn" aria-pressed={chosenPlanting?.id === p.id} data-testid="scalc-planting" onClick={() => setPlantingId(String(p.id))}>{t('ui.scalc.planting.line', { parcel: parcelName(p), area: formatArea(text(p.area_str)) })}</button>)}
        </div>}
        <label class="field"><span class="ds-muted">{t('ui.scalc.area')}</span><input class="input" inputMode="decimal" value={area} autoComplete="off" data-testid="scalc-area" onInput={(e) => setArea((e.target as HTMLInputElement).value)} /></label>
        <label class="field"><span class="ds-muted">{t('ui.scalc.water')}</span><input class="input" inputMode="decimal" value={water} autoComplete="off" data-testid="scalc-water" onInput={(e) => setWater((e.target as HTMLInputElement).value)} /></label>
        <label class="field"><span class="ds-muted">{t('ui.scalc.tank')}</span><input class="input" inputMode="decimal" value={tank} autoComplete="off" data-testid="scalc-tank" onInput={(e) => setTank((e.target as HTMLInputElement).value)} /></label>
        {blocked !== undefined && <p class="msg" role="status" data-testid="scalc-blocked">{blocked}</p>}
        {calc?.ok && <section class="spray-calc-result" data-testid="scalc-result">
          {calc.doses.map((d) => <p key={d.which} data-testid="scalc-product"><small>{t(WHICH[d.which])}</small><strong>{amountText(d.product)}</strong></p>)}
          <p data-testid="scalc-water-total"><small>{t('ui.scalc.water.total')}</small><strong>{calc.water.known ? t('ui.scalc.amount', { n: formatQty(calc.water.litres), unit: 'l' }) : t('ui.scalc.unknown.water')}</strong></p>
          <p data-testid="scalc-tanks"><small>{t('ui.scalc.tanks')}</small><strong>{calc.tanks.known ? calc.tanks.count : t('ui.scalc.unknown.tank')}</strong></p>
        </section>}
      </>}
      <NoteTip testid="scalc-note" text={t('ui.scalc.note')} />
    </DetailSheet>
  );
}
registerSheet('spraycalc', SprayCalcSheet);
