import { useState } from 'preact/hooks';
import { dataVersion, db, realFarmId } from '../db';
import { t, type I18nKey } from '../i18n';
import { formatQty } from '../i18n/format';
import { archived, buildParcel, TOPO, type Pin, type Topo } from '../parcels/parcel';
import { readPin } from '../parcels/pin';
import { put } from '../repo';
import { showUndo } from './Toast';

const TOPO_KEYS: Record<Topo, I18nKey> = { plain: 'parcel.topo.plain', slope: 'parcel.topo.slope', coast: 'parcel.topo.coast' };

/** Add a parcel: name + typed στρ. (+ optional GPS pin and terrain). No map needed, works offline, saves at once. */
export function ParcelForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [topo, setTopo] = useState<Topo | undefined>(undefined);
  const [pin, setPin] = useState<Pin | undefined>(undefined);
  const [pinFailed, setPinFailed] = useState(false);
  const [errors, setErrors] = useState<{ name: boolean; area: 'missing' | 'invalid' | undefined }>({ name: false, area: undefined });

  const takePin = async () => {
    const r = await readPin();
    setPinFailed(!r.known);
    setPin(r.known ? r.value : undefined);
  };
  const save = async () => {
    const r = buildParcel({ name, area, topo, pin }, realFarmId.value, new Date().toISOString(), crypto.randomUUID());
    if (!r.ok) { setErrors({ name: r.name, area: r.area }); return; }
    await put(db, 'parcels', r.row, 'insert');
    dataVersion.value++;
    showUndo(t('parcel.saved'), async () => { await put(db, 'parcels', archived(r.row, new Date().toISOString())); dataVersion.value++; }); // undo = archive it again
    onDone();
  };

  return (
    <section>
      <h1>{t('parcel.add')}</h1>
      <label class="field">{t('parcel.name')}
        <input class="input" value={name} autoComplete="off" onInput={(e) => setName((e.target as HTMLInputElement).value)} />
      </label>
      {errors.name && <p class="msg error" role="alert">{t('parcel.error.name')}</p>}
      <label class="field">{t('parcel.area')}
        <span class="inbox"><input class="input" value={area} inputMode="decimal" autoComplete="off" onInput={(e) => setArea((e.target as HTMLInputElement).value)} /><span class="unit">{t('unit.str')}</span></span>
      </label>
      {errors.area === 'missing' && <p class="msg error" role="alert">{t('parcel.error.area.missing')}</p>}
      {errors.area === 'invalid' && <p class="msg error" role="alert">{t('parcel.error.area.invalid')}</p>}

      <h2>{t('parcel.topo.title')}</h2>
      <div class="seg">
        {TOPO.map((k) => (
          <button key={k} aria-pressed={topo === k} onClick={() => setTopo(topo === k ? undefined : k)}>{t(TOPO_KEYS[k])}</button>
        ))}
      </div>

      <button class="btn secondary" onClick={() => void takePin()}>{t('parcel.pin')}</button>
      {pin && <p class="muted" data-testid="pin">{t('parcel.pin.set', { lat: formatQty(pin.lat), lng: formatQty(pin.lng), acc: formatQty(pin.accuracy_m) })}</p>}
      {pinFailed && <p class="muted" role="status">{t('parcel.pin.error')}</p>}

      <button class="btn" data-testid="parcel-save" onClick={() => void save()}>{t('parcel.save')}</button>
      <button class="btn secondary" onClick={onDone}>{t('parcel.cancel')}</button>
    </section>
  );
}
