import { useEffect, useState } from 'preact/hooks';
import { activeFarm, db, realFarmId } from '../db';
import { loadController } from '../legal/controller';
import { putSetting } from '../repo';
import { FILL_IN, MACHINE_COLUMNS, machineLines, toMachineCsv, toMachineJson, warningLines } from '../export/machine';
import { DEMO_FARM_ID } from '../config';
import { downloadText } from '../backup/download';
import { COLUMNS, registerLines, toCsv, type Column, type Fmt } from '../export/register';
import { formatDateTimeYear, formatLocalIso, t, type I18nKey } from '../i18n';
import { formatQty } from '../i18n/format';
import { FLAG_KEYS } from './SprayForm';
import { UNIT_KEYS } from './LabelUseForm';
import { nameOf } from './screens';
import { useRows } from './useRows';
import type { Flag } from '../spray/spray';
import type { DoseUnit } from '@aloni/rules-core';
import { BackBar } from './BackBar';
import './register-v2.css';

const COL_KEYS: Record<Column, I18nKey> = {
  start: 'register.col.start', lot: 'register.col.lot', when: 'register.col.when', parcel: 'register.col.parcel', crop: 'register.col.crop', area: 'register.col.area', product: 'register.col.product', reg_no: 'register.col.reg_no', dose: 'register.col.dose',
  unit: 'register.col.unit', qty: 'register.col.qty', water: 'register.col.water', applicator: 'register.col.applicator', label: 'register.col.label', phi_until: 'register.col.phi_until',
  rei_until: 'register.col.rei_until', flags: 'register.col.flags', note: 'register.col.note', late_reason: 'register.col.late_reason', record: 'register.col.record', amends: 'register.col.amends',
};
const LABEL_KEYS: Record<string, I18nKey> = { signed: 'register.label.signed', unsigned: 'labeluse.status.unsigned', changed: 'labeluse.status.changed', blocked: 'spray.flag.label_blocked', none: 'spray.flag.label_none' };
/** On screen the dates read «Πέμ 19 Νοε, 22:32»; the CSV keeps the plain local date and time. */
const FMT: Fmt = {
  when: formatLocalIso, num: (s) => (s ? formatQty(s) : ''), name: nameOf,
  flag: (f) => (f in FLAG_KEYS ? t(FLAG_KEYS[f as Flag]) : f), label: (s) => (s in LABEL_KEYS ? t(LABEL_KEYS[s]) : ''), unit: (u) => (u in UNIT_KEYS ? t(UNIT_KEYS[u as DoseUnit]) : ''),
};
const SCREEN: Fmt = { ...FMT, when: formatDateTimeYear };

/** The spray register for an inspection: a DRAFT, printable and downloadable as CSV. The app prepares it; a person checks and signs it. */
const FILL_KEYS: Record<(typeof FILL_IN)[number], I18nKey> = { missing_product_name: 'register.fill.name', missing_treated_area: 'register.fill.area', missing_authorisation_number: 'register.fill.auth', missing_start_time: 'register.fill.start', missing_iacs_parcel_id: 'register.fill.iacs', missing_eppo_code: 'register.fill.eppo', missing_bbch_stage: 'register.fill.bbch', dose_not_per_area: 'register.fill.dose' };

export function Register({ onBack }: { onBack: () => void }) {
  const [sprays, links, plantings, parcels, crops, products, workers] = [useRows('job_spray'), useRows('job_plantings'), useRows('plantings'), useRows('parcels'), useRows('crops'), useRows('products'), useRows('workers')]; const lots = useRows('stock_lots');
  const demo = activeFarm.value === DEMO_FARM_ID;
  const lines = registerLines({ sprays: sprays.rows ?? [], links: links.rows ?? [], plantings: plantings.rows ?? [], parcels: parcels.rows ?? [], crops: crops.rows ?? [], products: products.rows ?? [], workers: workers.rows ?? [], lots: lots.rows ?? [] }, { ...SCREEN, missing: t('register.missing') });
  const [holder, setHolder] = useState(''); const [vat, setVat] = useState(''); const [vatSaved, setVatSaved] = useState(false);
  useEffect(() => { void loadController(db).then((c) => setHolder(c?.name ?? '')); void db.settings.get('business').then((r) => setVat(String((r?.value as { vat_id?: string } | undefined)?.vat_id ?? ''))); }, []);
  const data = { sprays: sprays.rows ?? [], links: links.rows ?? [], plantings: plantings.rows ?? [], parcels: parcels.rows ?? [], crops: crops.rows ?? [], products: products.rows ?? [], workers: workers.rows ?? [], lots: lots.rows ?? [] };
  const csvLines = registerLines(data, { ...FMT, missing: t('register.missing') });
  const fillIn = FILL_IN.filter((c) => warningLines(data).some((w) => w.warning_code === c));
  const fillText = t('register.fillin', { list: fillIn.map((c) => t(FILL_KEYS[c])).join(', ') });
  const stamp = formatLocalIso(new Date().toISOString());
  const day = stamp.split(' ')[0];
  const holderLine = t('register.holder', { name: holder || t('register.holder.none'), vat: vat || t('register.holder.none') });
  const machine = () => { const m = machineLines(data, { name: holder, vatId: vat }); downloadText(`aloni-${demo ? 'demo-' : ''}register-machine-${day}.csv`, toMachineCsv(MACHINE_COLUMNS, m.map((l) => MACHINE_COLUMNS.map((c) => l[c]))), 'text/csv;charset=utf-8'); };
  const json = () => downloadText(`aloni-${demo ? 'demo-' : ''}register-machine-${day}.json`, toMachineJson(data, { name: holder, vatId: vat }, new Date().toISOString()), 'application/json;charset=utf-8');
  const warnings = () => downloadText(`aloni-${demo ? 'demo-' : ''}register-warnings-${day}.csv`, toMachineCsv(['record_id', 'warning_code'], warningLines(data).map((w) => [w.record_id, w.warning_code])), 'text/csv;charset=utf-8');
  const csv = () => downloadText(`aloni-${demo ? 'demo-' : ''}psekasmoi-prosxedio-${stamp.split(' ')[0]}.csv`, toCsv(`${t('register.draft')} — ${holderLine}`, COLUMNS.map((c) => t(COL_KEYS[c])), csvLines), 'text/csv;charset=utf-8');
  return (
    <section class="register detail" data-testid="register">
      <header class="band">
        <div class="noprint"><BackBar onBack={onBack} /></div>
        <h1 tabIndex={-1}>{t('register.title')}{demo && <span class="badge">{t('badge.demo')}</span>}</h1>
      </header>
      <p class="badge blocked" data-testid="register-draft">{t('register.draft')}</p>
      {fillIn.length > 0 && <p class="card" data-testid="register-fillin">{fillText}</p>}
      <p class="muted">{t('register.generated', { d: formatDateTimeYear(new Date().toISOString()) })}</p>
      <p class="muted" data-testid="register-holder">{holderLine}</p>
      {!demo && (
        <label class="field noprint">{t('register.vat')}
          <input class="input" value={vat} autoComplete="off" data-testid="register-vat" onInput={(e) => { setVat((e.target as HTMLInputElement).value); setVatSaved(false); }} />
          <button class="btn secondary" onClick={() => { void putSetting(db, realFarmId.value, 'business', { vat_id: vat.trim() }).then(() => setVatSaved(true)); }}>{t('register.vat.save')}</button>
          {vatSaved && <span class="msg" role="status">{t('register.vat.saved')}</span>}
        </label>
      )}
      <div class="noprint register-actions">
        <button class="btn" data-testid="register-csv" onClick={csv}>{t('register.csv')}</button>
        <button class="btn" data-testid="register-csv-machine" onClick={machine}>{t('register.csv.machine')}</button>
        <button class="btn" data-testid="register-json" onClick={json}>{t('register.json')}</button>
        <button class="btn" data-testid="register-csv-warnings" onClick={warnings}>{t('register.csv.warnings')}</button>
        <button class="btn" data-testid="register-print" onClick={() => window.print()}>{t('register.print')}</button>
        <button class="btn secondary" data-testid="register-csv-machine" onClick={machine}>{t('register.csv.machine')}</button>
        <button class="btn secondary" data-testid="register-csv-warnings" onClick={warnings}>{t('register.csv.warnings')}</button>
        <button class="btn secondary" data-testid="register-print" onClick={() => window.print()}>{t('register.print')}</button>
      </div>
      {sprays.rows && lines.length === 0 && <p class="muted" data-testid="register-empty">{t('register.empty')}</p>}
      {lines.map((l, i) => (
        <div class="card register-record" key={`${l.record}-${i}`} data-testid="register-line">
          {(l.product || l.when) && <div class="register-record-head">
            {l.product && <h2 data-testid="register-record-product">{t('labeluse.line', { name: t('register.col.product'), value: l.product })}</h2>}
            {l.when && <small data-testid="register-record-end">{t('labeluse.line', { name: t('register.col.when'), value: l.when })}</small>}
          </div>}
          {COLUMNS.filter((c) => c !== 'product' && c !== 'when' && l[c]).map((c) => <small key={c}>{t('labeluse.line', { name: t(COL_KEYS[c]), value: l[c] })}</small>)}
        </div>
      ))}
      <p class="sign">{t('register.sign')}</p>
    </section>
  );
}
