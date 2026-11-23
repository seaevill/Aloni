import { useEffect, useState } from 'preact/hooks';
import { activeFarm, db } from '../db';
import { formatDate, t } from '../i18n';
import { formatQty } from '../i18n/format';
import { athensToday } from '../plantings/planting';
import { putLocal } from '../repo';
import { cropStats, harvestPace, isFew, recentPace, type PlanInput } from '../summary/crop-stats';
import type { Row } from '../db/schema';

// Φυτά › a crop: «Ρυθμός συγκομιδής» (the owner's own estimate of the crates still to come ÷ the days until the day he picks) and «Από τις καταγραφές σας» (numbers from his own harvests).
// Kept on this phone per farm. Nothing is taken from a book and nothing is a default: no estimate / no records = «άγνωστο». Information only.
const key = (farm: string): string => `harvest_plan:${farm}`;
type Plans = Record<string, PlanInput>;
const round1 = (n: number): string => formatQty(Math.round(n * 10) / 10);

export function CropPace({ crop, plantings, harvests }: { crop: Row; plantings: readonly Row[]; harvests: readonly Row[] }) {
  const farm = activeFarm.value; const id = String(crop.id);
  const [plans, setPlans] = useState<Plans>({}); const [editing, setEditing] = useState(false);
  const [crates, setCrates] = useState(''); const [end, setEnd] = useState('');
  useEffect(() => { void (async () => setPlans(((await db.settings.get(key(farm)))?.value as Plans | undefined) ?? {}))(); }, [farm]);
  const today = athensToday(new Date()) ?? '1970-01-01';
  const plan = plans[id];
  const pace = harvestPace(plan, today);
  const recent = recentPace(id, plantings, harvests, today, 21);
  const stats = cropStats(id, plantings, harvests);
  const save = async (next: Plans) => { setPlans(next); await putLocal(db, key(farm), next); };
  const open = () => { setCrates(plan?.crates ?? ''); setEnd(plan?.end ?? ''); setEditing(true); };
  const submit = async () => { const p = harvestPace({ crates, end }, today); if (!p.known) return; await save({ ...plans, [id]: { crates: crates.trim(), end } }); setEditing(false); };
  const clear = async () => { const { [id]: _gone, ...rest } = plans; await save(rest); setEditing(false); };
  const check = harvestPace({ crates, end }, today);
  return (
    <div data-testid="crop-pace-wrap">
      <section class="card pace" data-testid="crop-pace">
        <h3>{t('ui.pace.title')}</h3>
        {pace.known ? <>
          <p class="pace-left" data-testid="pace-left">{t('ui.pace.left', { crates: formatQty(Number(plan?.crates.replace(',', '.'))), days: formatQty(pace.days) })}</p>
          <p class="pace-rate" data-testid="pace-rate"><strong>{t('ui.pace.rate', { n: round1(pace.perDay) })}</strong></p>
          <small data-testid="pace-ends">{t('ui.pace.ends', { day: formatDate(pace.endDay) })}</small>
          <small data-testid="pace-source">{t('ui.pace.source')}</small>
        </> : <p class="muted" data-testid="pace-unknown">{t('ui.pace.unknown')}</p>}
        {recent && <small data-testid="pace-recent">{t('ui.pace.recent', { n: round1(recent.perDay) })}</small>}
        {!editing && <button type="button" class="btn secondary" data-testid="pace-edit" onClick={open}>{t(pace.known ? 'ui.pace.change' : 'ui.pace.set')}</button>}
        {editing && <div class="pace-form" data-testid="pace-form">
          <label class="field"><span class="ds-muted">{t('ui.pace.crates.label')}</span><input class="input" inputMode="decimal" value={crates} autoComplete="off" data-testid="pace-crates" onInput={(e) => setCrates((e.target as HTMLInputElement).value)} /></label>
          <label class="field"><span class="ds-muted">{t('ui.pace.end.label')}</span><input class="input" type="date" value={end} data-testid="pace-end" onInput={(e) => setEnd((e.target as HTMLInputElement).value)} /></label>
          {(crates !== '' || end !== '') && !check.known && <p class="msg error" role="alert" data-testid="pace-error">{t('ui.pace.err')}</p>}
          <button type="button" class="btn" data-testid="pace-save" disabled={!check.known} onClick={() => void submit()}>{t('ui.pace.save')}</button>
          {plan && <button type="button" class="btn quiet" data-testid="pace-clear" onClick={() => void clear()}>{t('ui.pace.clear')}</button>}
        </div>}
      </section>
      <section class="card pace" data-testid="crop-own">
        <h3>{t('ui.own.title')}</h3>
        {!stats.yield && !stats.gap && <p class="muted" data-testid="own-none">{t('ui.own.none')}</p>}
        {stats.yield && <div data-testid="own-yield"><small>{t('ui.own.yield')}</small><strong>{t('ui.own.yield.v', { n: round1(stats.yield.perStrema) })}</strong><small>{isFew(stats.yield.n) ? t('ui.own.few', { k: formatQty(stats.yield.n) }) : t('ui.own.from', { k: formatQty(stats.yield.n) })}</small></div>}
        {stats.gap && <div data-testid="own-gap"><small>{t('ui.own.gap')}</small><strong>{t('ui.own.gap.v', { n: round1(stats.gap.days) })}</strong><small>{isFew(stats.gap.n) ? t('ui.own.few', { k: formatQty(stats.gap.n) }) : t('ui.own.from', { k: formatQty(stats.gap.n) })}</small></div>}
        {stats.unusable > 0 && <small data-testid="own-unusable">{t('ui.own.unusable', { k: formatQty(stats.unusable) })}</small>}
      </section>
    </div>
  );
}
