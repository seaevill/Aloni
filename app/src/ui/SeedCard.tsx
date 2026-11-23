import { useEffect, useState } from 'preact/hooks';
import { activeFarm, db } from '../db';
import { t, type I18nKey } from '../i18n';
import { formatArea, formatDerived } from '../i18n/format';
import { loadRates, removeRate, seedKg, setRate, type Seed } from '../seed/seed';
import type { Row } from '../db/schema';
import { nameOf } from './screens';
import './seed.css';

// Φυτά › a crop › «Σπόρος»: the seed needed for each planting = the seed rate the grower (or his agronomist) wrote × the planting's area. The app proposes no rate; no rate = unknown. Kept on this phone.
const WHY: Record<'no-rate' | 'no-area', I18nKey> = { 'no-rate': 'ui.seed.unknown.rate', 'no-area': 'ui.seed.unknown.area' };
const kgText = (k: Seed): string => (k.known ? t('ui.seed.kg', { n: formatDerived(k.kg, 2) }) : t(WHY[k.reason]));
const text = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');

export function SeedCard({ crop, plantings, parcels }: { crop: Row; plantings: readonly Row[]; parcels: readonly Row[] }) {
  const farm = activeFarm.value; const id = String(crop.id);
  const [rate, setRateState] = useState<string>(); const [edit, setEdit] = useState(false); const [draft, setDraft] = useState(''); const [bad, setBad] = useState(false);
  const reload = async () => setRateState((await loadRates(db, farm))[id]);
  useEffect(() => { void reload(); }, [farm, id]);
  const save = async () => { try { await setRate(db, farm, id, draft); setBad(false); setEdit(false); await reload(); } catch { setBad(true); } };
  const rows = plantings.map((p) => ({ p, kg: seedKg(rate, text(p.area_str)) }));
  const total = rows.every((r) => r.kg.known) && rows.length > 0 ? rows.reduce((sum, r) => (r.kg.known ? sum + r.kg.kg : sum), 0) : undefined;
  const rateText = rate === undefined ? t('ui.seed.rate.none') : t('ui.seed.rate', { v: rate });
  return (
    <section class="card seed" data-testid="seed-card">
      <h3>{t('ui.seed.title')}</h3>
      <p data-testid="seed-rate">{rateText}</p>
      {rows.map(({ p, kg }) => (
        <div key={String(p.id)} data-testid="seed-row">
          <strong>{nameOf(parcels.find((x) => x.id === p.parcel_id) ?? {}) || t('ui.unknown')}</strong>
          <small>{formatArea(text(p.area_str))}</small>
          <span data-testid="seed-kg">{kgText(kg)}</span>
        </div>
      ))}
      {total !== undefined && <p data-testid="seed-total"><strong>{t('ui.seed.total', { n: formatDerived(total, 2) })}</strong></p>}
      {!edit && <button type="button" class="btn secondary" data-testid="seed-edit" onClick={() => { setDraft(rate ?? ''); setEdit(true); }}>{t('ui.seed.edit')}</button>}
      {edit && <div class="seed-form" data-testid="seed-form">
        <label class="field"><span class="ds-muted">{t('ui.seed.label')}</span><input class="input" inputMode="decimal" value={draft} autoComplete="off" data-testid="seed-input" onInput={(e) => setDraft((e.target as HTMLInputElement).value)} /></label>
        {bad && <p class="msg error" role="alert" data-testid="seed-error">{t('ui.seed.err')}</p>}
        <button type="button" class="btn" data-testid="seed-save" onClick={() => void save()}>{t('ui.seed.save')}</button>
        {rate !== undefined && <button type="button" class="btn quiet" data-testid="seed-remove" onClick={() => void removeRate(db, farm, id).then(() => { setEdit(false); return reload(); })}>{t('ui.seed.remove')}</button>}
      </div>}
      <small data-testid="seed-note">{t('ui.seed.note')}</small>
    </section>
  );
}
