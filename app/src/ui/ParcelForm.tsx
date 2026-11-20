import { useState } from 'preact/hooks';
import { dataVersion, db, realFarmId } from '../db';
import { t, type I18nKey } from '../i18n';
import { formatQty } from '../i18n/format';
import { archived, buildParcel, TOPO, type Pin, type Topo } from '../parcels/parcel';
import { readPin } from '../parcels/pin';
import { put } from '../repo';
import { applyEdit, commaText } from '../records/edits';
import { validBoundary, type Boundary } from '../map/geo';
import { ParcelMap } from './ParcelMap';
import { useSubmit } from './useSubmit';
import type { Row } from '../db/schema';
import { showUndo } from './Toast';

export const TOPO_KEYS: Record<Topo, I18nKey> = { plain: 'parcel.topo.plain', slope: 'parcel.topo.slope', coast: 'parcel.topo.coast' };

/** Add a parcel: name + typed στρ. (+ optional GPS pin and terrain). No map needed, works offline, saves at once. */
export function ParcelForm({ onDone, existing }: { onDone: () => void; existing?: Row }) {
  const { busy, submit } = useSubmit();
  const [name, setName] = useState(typeof existing?.name === 'string' ? existing.name : '');
  const [area, setArea] = useState(commaText(existing?.area_str));
  const [topo, setTopo] = useState<Topo | undefined>(TOPO.find((k) => k === existing?.topo_class));
  const [why, setWhy] = useState(''); const [whyMissing, setWhyMissing] = useState(false);
  const [pin, setPin] = useState<Pin | undefined>(undefined);
  const [pinFailed, setPinFailed] = useState(false); const [boundary, setBoundary] = useState<Boundary | undefined>(validBoundary(existing?.boundary) ? existing.boundary : undefined); const [mapOpen, setMapOpen] = useState(false);
  const [osde, setOsde] = useState(typeof existing?.opekepe_code === 'string' ? existing.opekepe_code : '');
  const [errors, setErrors] = useState<{ name: boolean; area: 'missing' | 'invalid' | 'implausible' | undefined }>({ name: false, area: undefined });

  const takePin = async () => {
    const r = await readPin();
    setPinFailed(!r.known);
    setPin(r.known ? r.value : undefined);
  };
  if (mapOpen) return <ParcelMap initial={boundary} typedArea={area} onCancel={() => setMapOpen(false)} onDone={(b) => { setBoundary(b); setMapOpen(false); }} />;
  const titleKey: I18nKey = existing ? 'edit.title' : 'parcel.add';
  const save = async () => {
    const r = buildParcel({ name, area, topo, pin, osde, boundary }, realFarmId.value, new Date().toISOString(), crypto.randomUUID());
    if (!r.ok) { setErrors({ name: r.name, area: r.area }); return; }
    if (existing) { // append-only: the row gets the new values, `edits` keeps the previous ones with the reason
      const e = applyEdit(existing, { name: r.row.name, area_str: r.row.area_str, topo_class: r.row.topo_class, opekepe_code: r.row.opekepe_code, boundary: r.row.boundary }, why, new Date().toISOString());
      if (e.kind === 'nochange') { onDone(); return; }
      if (e.kind === 'reason') { setWhyMissing(true); return; }
      await put(db, 'parcels', e.row, 'update');
      dataVersion.value++;
      onDone();
      return;
    }
    await put(db, 'parcels', r.row, 'insert');
    dataVersion.value++;
    showUndo(t('parcel.saved'), async () => { await put(db, 'parcels', archived(r.row, new Date().toISOString())); dataVersion.value++; }); // undo = archive it again
    onDone();
  };

  return (
    <section>
      <h1>{t(titleKey)}</h1>
      {existing && <p class="muted">{t('edit.note')}</p>}
      <label class="field">{t('parcel.name')}
        <input class="input" value={name} autoComplete="off" onInput={(e) => setName((e.target as HTMLInputElement).value)} />
      </label>
      {errors.name && <p class="msg error" role="alert">{t('parcel.error.name')}</p>}
      <label class="field">{t('parcel.area')}
        <span class="inbox"><input class="input" value={area} inputMode="decimal" autoComplete="off" onInput={(e) => setArea((e.target as HTMLInputElement).value)} /><span class="unit">{t('unit.str')}</span></span>
      </label>
      {errors.area === 'missing' && <p class="msg error" role="alert">{t('parcel.error.area.missing')}</p>}
      {errors.area === 'invalid' && <p class="msg error" role="alert">{t('parcel.error.area.invalid')}</p>}
      {errors.area === 'implausible' && <p class="msg error" role="alert">{t('parcel.error.area.big')}</p>}

      <label class="field">{t('parcel.osde')}
        <input class="input" value={osde} autoComplete="off" data-testid="parcel-osde" onInput={(e) => setOsde((e.target as HTMLInputElement).value)} />
      </label>

      <h2>{t('parcel.topo.title')}</h2>
      <div class="seg">
        {TOPO.map((k) => (
          <button key={k} aria-pressed={topo === k} onClick={() => setTopo(topo === k ? undefined : k)}>{t(TOPO_KEYS[k])}</button>
        ))}
      </div>

      {existing && <label class="field">{t('edit.reason')}<input class="input" value={why} autoComplete="off" data-testid="edit-reason" onInput={(e) => setWhy((e.target as HTMLInputElement).value)} /></label>}
      {whyMissing && why.trim() === '' && <p class="msg error" role="alert" data-testid="edit-reason-error">{t('edit.reason.error')}</p>}

      <button class="row" data-testid="parcel-map-open" onClick={() => setMapOpen(true)}><span>{t('map.open')}</span><span aria-hidden="true" class="chev" /></button>
      {boundary && <p class="muted" data-testid="parcel-boundary-set">{t('map.has')}</p>}

      <button class="btn secondary" onClick={() => void takePin()}>{t('parcel.pin')}</button>
      {pin && <p class="muted" data-testid="pin">{t('parcel.pin.set', { lat: formatQty(pin.lat), lng: formatQty(pin.lng), acc: formatQty(pin.accuracy_m) })}</p>}
      {pinFailed && <p class="muted" role="status">{t('parcel.pin.error')}</p>}

      <button class="btn" data-testid="parcel-save" onClick={() => void submit(save)} disabled={busy}>{t('parcel.save')}</button>
      <button class="btn secondary" onClick={onDone}>{t('parcel.cancel')}</button>
    </section>
  );
}
