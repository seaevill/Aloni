import { useEffect, useState } from 'preact/hooks';
import { activeFarm, db, realFarmId } from '../db';
import { loadController } from '../legal/controller';
import { putSetting } from '../repo';
import { MACHINE_COLUMNS, machineLines, toMachineCsv, warningLines } from '../export/machine';
import { DEMO_FARM_ID } from '../config';
import { downloadText } from '../backup/download';
import { COLUMNS, registerLines, toCsv, type Column, type Fmt } from '../export/register';
import { formatLocalIso, t, type I18nKey } from '../i18n';
import { formatQty } from '../i18n/format';
import { FLAG_KEYS } from './SprayForm';
import { UNIT_KEYS } from './LabelUseForm';
import { nameOf } from './screens';
import { useRows } from './useRows';
import type { Flag } from '../spray/spray';
import type { DoseUnit } from '@aloni/rules-core';
import { BackBar } from './BackBar';

const COL_KEYS: Record<Column, I18nKey> = {
  when: 'register.col.when', parcel: 'register.col.parcel', crop: 'register.col.crop', area: 'register.col.area', product: 'register.col.product', reg_no: 'register.col.reg_no', dose: 'register.col.dose',
  unit: 'register.col.unit', qty: 'register.col.qty', water: 'register.col.water', applicator: 'register.col.applicator', label: 'register.col.label', phi_until: 'register.col.phi_until',
  rei_until: 'register.col.rei_until', flags: 'register.col.flags', note: 'register.col.note', late_reason: 'register.col.late_reason', record: 'register.col.record', amends: 'register.col.amends',
};
const LABEL_KEYS: Record<string, I18nKey> = { signed: 'register.label.signed', unsigned: 'labeluse.status.unsigned', changed: 'labeluse.status.changed', blocked: 'spray.flag.label_blocked', none: 'spray.flag.label_none' };
const FMT: Fmt = {
  when: formatLocalIso, num: (s) => (s ? formatQty(s) : ''), name: nameOf,
  flag: (f) => (f in FLAG_KEYS ? t(FLAG_KEYS[f as Flag]) : f), label: (s) => (s in LABEL_KEYS ? t(LABEL_KEYS[s]) : ''), unit: (u) => (u in UNIT_KEYS ? t(UNIT_KEYS[u as DoseUnit]) : ''),
};

/** The spray register for an inspection: a DRAFT, printable and downloadable as CSV. The app prepares it; a person checks and signs it. */
export function Register({ onBack }: { onBack: () => void }) {
  const [sprays, links, plantings, parcels, crops, products, workers] = [useRows('job_spray'), useRows('job_plantings'), useRows('plantings'), useRows('parcels'), useRows('crops'), useRows('products'), useRows('workers')];
  const demo = activeFarm.value === DEMO_FARM_ID;
  const lines = registerLines({ sprays: sprays.rows ?? [], links: links.rows ?? [], plantings: plantings.rows ?? [], parcels: parcels.rows ?? [], crops: crops.rows ?? [], products: products.rows ?? [], workers: workers.rows ?? [] }, FMT);
  const [holder, setHolder] = useState(''); const [vat, setVat] = useState(''); const [vatSaved, setVatSaved] = useState(false);
  useEffect(() => { void loadController(db).then((c) => setHolder(c?.name ?? '')); void db.settings.get('business').then((r) => setVat(String((r?.value as { vat_id?: string } | undefined)?.vat_id ?? ''))); }, []);
  const data = { sprays: sprays.rows ?? [], links: links.rows ?? [], plantings: plantings.rows ?? [], parcels: parcels.rows ?? [], crops: crops.rows ?? [], products: products.rows ?? [], workers: workers.rows ?? [] };
  const stamp = formatLocalIso(new Date().toISOString());
  const day = stamp.split(' ')[0];
  const holderLine = t('register.holder', { name: holder || t('register.holder.none'), vat: vat || t('register.holder.none') });
  const machine = () => { const m = machineLines(data, { name: holder, vatId: vat }); downloadText(`aloni-${demo ? 'demo-' : ''}register-machine-${day}.csv`, toMachineCsv(MACHINE_COLUMNS, m.map((l) => MACHINE_COLUMNS.map((c) => l[c]))), 'text/csv;charset=utf-8'); };
  const warnings = () => downloadText(`aloni-${demo ? 'demo-' : ''}register-warnings-${day}.csv`, toMachineCsv(['record_id', 'warning_code'], warningLines(data).map((w) => [w.record_id, w.warning_code])), 'text/csv;charset=utf-8');
  const csv = () => downloadText(`aloni-${demo ? 'demo-' : ''}psekasmoi-prosxedio-${stamp.split(' ')[0]}.csv`, toCsv(`${t('register.draft')} — ${holderLine}`, COLUMNS.map((c) => t(COL_KEYS[c])), lines), 'text/csv;charset=utf-8');
  return (
    <section class="register" data-testid="register">
      <h1>{t('register.title')}{demo && <span class="badge">{t('badge.demo')}</span>}</h1>
      <p class="badge blocked" data-testid="register-draft">{t('register.draft')}</p>
      <p class="muted">{t('register.generated', { d: stamp })}</p>
      <p class="muted" data-testid="register-holder">{holderLine}</p>
      {!demo && (
        <label class="field noprint">{t('register.vat')}
          <input class="input" value={vat} autoComplete="off" data-testid="register-vat" onInput={(e) => { setVat((e.target as HTMLInputElement).value); setVatSaved(false); }} />
          <button class="btn secondary" onClick={() => { void putSetting(db, realFarmId.value, 'business', { vat_id: vat.trim() }).then(() => setVatSaved(true)); }}>{t('register.vat.save')}</button>
          {vatSaved && <span class="msg" role="status">{t('register.vat.saved')}</span>}
        </label>
      )}
      <div class="noprint">
        <BackBar onBack={onBack} />
        <button class="btn" data-testid="register-csv" onClick={csv}>{t('register.csv')}</button>
        <button class="btn" data-testid="register-csv-machine" onClick={machine}>{t('register.csv.machine')}</button>
        <button class="btn" data-testid="register-csv-warnings" onClick={warnings}>{t('register.csv.warnings')}</button>
        <button class="btn" data-testid="register-print" onClick={() => window.print()}>{t('register.print')}</button>
      </div>
      {sprays.rows && lines.length === 0 && <p class="muted" data-testid="register-empty">{t('register.empty')}</p>}
      {lines.map((l, i) => (
        <div class="card" key={`${l.record}-${i}`} data-testid="register-line">
          {COLUMNS.filter((c) => l[c]).map((c) => <small key={c}>{t('labeluse.line', { name: t(COL_KEYS[c]), value: l[c] })}</small>)}
        </div>
      ))}
      <p class="sign">{t('register.sign')}</p>
    </section>
  );
}
