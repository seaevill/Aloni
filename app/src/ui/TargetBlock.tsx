import { useEffect, useState } from 'preact/hooks';
import { activeFarm, db } from '../db';
import { delLocal, putLocal } from '../repo';
import { formatDate, t } from '../i18n';
import { formatQty } from '../i18n/format';
import { parseTarget, seasonProgress, type SeasonTarget } from '../summary/target';
import { Chip } from './ds/Chip';
import { ProgressRing } from './ds/ProgressRing';
import { SheetFact } from './ds/DetailSheet';
import { useRows } from './useRows';
import { NoteTip } from './NoteTip';

// The season target on the crop sheet (E6): the target the owner typed, the crates LOGGED since the start day, what remains, and a ring. Until the server table exists (SQL 0040) the target is kept on THIS phone only, and the sheet says so.
const keyOf = (cropId: string): string => `season_target:${activeFarm.value}:${cropId}`;
const isTarget = (v: unknown): v is SeasonTarget => typeof v === 'object' && v !== null && typeof (v as SeasonTarget).crates === 'string' && typeof (v as SeasonTarget).since === 'string';

export function TargetBlock({ cropId }: { cropId: string }) {
  const plantings = useRows('plantings'); const harvests = useRows('job_harvest');
  const [target, setTarget] = useState<SeasonTarget | undefined | null>(null);       // null = still reading
  const [editing, setEditing] = useState(false); const [crates, setCrates] = useState(''); const [since, setSince] = useState(''); const [bad, setBad] = useState<'crates' | 'since' | undefined>(undefined);
  useEffect(() => { void db.settings.get(keyOf(cropId)).then((r) => setTarget(isTarget(r?.value) ? r.value : undefined)); }, [cropId, activeFarm.value]);
  if (target === null) return null;
  const save = async () => {
    const r = parseTarget(crates, since);
    if (!r.ok) { setBad(r.why); return; }
    await putLocal(db, keyOf(cropId), r.value); setTarget(r.value); setEditing(false); setBad(undefined);
  };
  const clear = async () => { await delLocal(db, keyOf(cropId)); setTarget(undefined); setEditing(false); };
  const editLabel = target ? t('ui.target.change') : t('ui.target.set');
  const edit = () => { setCrates(target?.crates ?? ''); setSince(target?.since ?? ''); setBad(undefined); setEditing(true); };
  const p = target ? seasonProgress(cropId, plantings.rows ?? [], harvests.rows ?? [], target, new Date().toISOString()) : undefined;
  return (
    <section data-testid="target-block">
      {!target && <SheetFact name={t('ui.sheet.crop.target')} unknown={t('ui.sheet.crop.target.none')} />}
      {target && p && (
        <>
          <SheetFact name={t('ui.sheet.crop.target')} value={t('ui.target.value', { n: formatQty(p.target), d: formatDate(target.since) })} />
          {p.done !== undefined && p.percent !== undefined && p.remaining !== undefined
            ? <div class="ds-ring-block"><ProgressRing percent={p.percent} remaining={formatQty(p.remaining)} unit={t('ui.target.remaining')} /></div>
            : <><Chip tone="unknown">{t('ui.target.nodata.chip')}</Chip><p class="ds-muted" data-testid="target-why">{t('ui.target.nodata.why', { d: formatDate(target.since) })}</p></>}
          {p.done !== undefined && <SheetFact name={t('ui.target.done')} value={formatQty(p.done)} />}
          {p.over > 0 && <p class="ds-muted" data-testid="target-over">{t('ui.target.over', { n: formatQty(p.over) })}</p>}
          {p.unreadable > 0 && <p class="ds-muted" data-testid="target-unreadable">{t('ui.target.unreadable', { n: p.unreadable })}</p>}
        </>
      )}
      {editing ? (
        <div class="card" data-testid="target-form">
          <label class="field">{t('ui.target.crates')}<input class="input" inputMode="numeric" autoComplete="off" value={crates} data-testid="target-crates" onInput={(e) => setCrates((e.target as HTMLInputElement).value)} /></label>
          {bad === 'crates' && <p class="msg error" role="alert">{t('ui.target.err.crates')}</p>}
          <label class="field">{t('ui.target.since')}<input class="input" type="date" value={since} data-testid="target-since" onInput={(e) => setSince((e.target as HTMLInputElement).value)} /></label>
          {bad === 'since' && <p class="msg error" role="alert">{t('ui.target.err.since')}</p>}
          <button type="button" class="btn" data-testid="target-save" onClick={() => void save()}>{t('ui.target.save')}</button>
        </div>
      ) : (
        <>
          <button type="button" class="btn secondary" data-testid="target-edit" onClick={edit}>{editLabel}</button>
          {target && <button type="button" class="btn secondary" data-testid="target-clear" onClick={() => void clear()}>{t('ui.target.clear')}</button>}
        </>
      )}
      <NoteTip inline testid="target-local" text={t('ui.target.local')} />
    </section>
  );
}
