import { useState } from 'preact/hooks';
import { parsePhiDays, parseReiHours, phiEnd, reiEnd } from '@aloni/rules-core';
import { dataVersion, db, realFarmId } from '../db';
import { put } from '../repo';
import { formatDateTime, t, type I18nKey } from '../i18n';
import { NOT_ON_LABEL } from '../labels/label-use';
import { buildWaitEntry, effectiveSprays, type Flag } from '../spray/spray';
import type { Row } from '../db/schema';
import { FLAG_KEYS } from './SprayForm';
import { nameOf } from './screens';
import { UnsyncedMark } from './states';
import { useRows } from './useRows';

const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const RED: readonly string[] = ['label_none', 'label_blocked'];
/** The waiting period as a sentence, or undefined when it is unknown (the card then says so, in red). Recomputed from the stored days and time. */
const waitLine = (r: Row, days: 'phi_days' | 'rei_hours'): string | undefined => {
  const v = text(r[days]);
  if (!v || v === NOT_ON_LABEL) return undefined;
  const end = days === 'phi_days' ? phiEnd(text(r.sprayed_at), parsePhiDays(v)) : reiEnd(text(r.sprayed_at), parseReiHours(v));
  return end.known ? t(days === 'phi_days' ? 'spray.phi.until' : 'spray.rei.until', { d: formatDateTime(end.value) }) : undefined;
};

/** Bora types the label's waiting period for a spray whose PHI is unknown. It is saved as a NEW row (the original stays); it never lifts a block by itself: the harvest opens only once this period has run out. */
function WaitEntry({ spray, onDone }: { spray: Row; onDone: () => void }) {
  const [phi, setPhi] = useState('');
  const [rei, setRei] = useState('');
  const [bad, setBad] = useState(false);
  const save = async () => {
    const e = buildWaitEntry(spray, phi, rei, new Date().toISOString(), crypto.randomUUID());
    if (!e.ok) { setBad(true); return; }
    await put(db, 'job_spray', { ...e.row, farm_id: realFarmId.value }, 'insert');
    dataVersion.value++;
    onDone();
  };
  return (
    <div class="card" data-testid="wait-entry">
      <p class="muted">{t('spray.phi.entry.note')}</p>
      <label class="field">{t('labeluse.phi')}
        <input class="input" value={phi} inputMode="numeric" autoComplete="off" data-testid="wait-phi" onInput={(e) => setPhi((e.target as HTMLInputElement).value)} />
      </label>
      <label class="field">{t('labeluse.rei')}
        <input class="input" value={rei} inputMode="numeric" autoComplete="off" data-testid="wait-rei" onInput={(e) => setRei((e.target as HTMLInputElement).value)} />
      </label>
      {bad && <p class="msg error" role="alert">{t('labeluse.error.whole')}</p>}
      <button class="btn" data-testid="wait-save" onClick={() => void save()}>{t('product.save')}</button>
      <button class="btn secondary" onClick={onDone}>{t('product.cancel')}</button>
    </div>
  );
}

/** The sprays that were recorded, newest first: who sprayed, what, when, the marks, and the waiting periods (unknown ones in red: the harvest is blocked). */
export function Sprays() {
  const [entering, setEntering] = useState('');
  const sprays = useRows('job_spray'); const links = useRows('job_plantings'); const plantings = useRows('plantings');
  const crops = useRows('crops'); const products = useRows('products'); const workers = useRows('workers');
  const list = effectiveSprays(sprays.rows ?? []).sort((a, b) => text(b.sprayed_at).localeCompare(text(a.sprayed_at)));
  const cards = list.map((r) => {
    const cropNames = (links.rows ?? []).filter((l) => l.job_id === r.job_id).map((l) => plantings.rows?.find((p) => p.id === l.planting_id)).map((p) => nameOf(crops.rows?.find((c) => c.id === p?.crop_id) ?? {}));
    const phi = waitLine(r, 'phi_days');
    return {
      r, phi, rei: waitLine(r, 'rei_hours'), flags: (Array.isArray(r.flags) ? r.flags : []) as Flag[],
      title: nameOf(products.rows?.find((p) => p.id === r.product_id) ?? {}), crops: [...new Set(cropNames)].join(', '),
      by: t('spray.by', { name: String(workers.rows?.find((w) => w.id === r.applicator_id)?.name ?? t('value.unknown')) }),
      when: formatDateTime(text(r.sprayed_at)),
    };
  });
  return (
    <>
      <h2>{t('spray.title')}</h2>
      {sprays.rows && cards.length === 0 && <p class="muted" data-testid="spray-empty">{t('spray.empty')}</p>}
      {cards.map((c) => (
        <div class="card" key={c.r.id} data-testid="spray">{c.title}
          <small>{c.crops}</small><small>{c.by}</small><small>{c.when}</small>
          {c.flags.map((f) => <span key={f} class={RED.includes(f) ? 'badge blocked' : 'badge warn'}>{t(FLAG_KEYS[f] as I18nKey)}</span>)}
          {c.phi ? <small data-testid="spray-phi">{c.phi}</small> : <span class="badge blocked" data-testid="spray-phi-unknown">{t('spray.phi.unknown')}</span>}
          {c.phi && c.r.phi_source === 'manual' && <small data-testid="spray-manual">{t('spray.phi.manual')}</small>}
          {!c.phi && entering !== c.r.id && <button class="btn secondary" data-testid="wait-open" onClick={() => setEntering(c.r.id)}>{t('spray.phi.enter')}</button>}
          {entering === c.r.id && <WaitEntry spray={c.r} onDone={() => setEntering('')} />}
          {c.rei && <small data-testid="spray-rei">{c.rei}</small>}
          <UnsyncedMark id={c.r.id} />
        </div>
      ))}
    </>
  );
}
