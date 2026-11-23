import { useEffect, useState } from 'preact/hooks';
import { activeFarm, db } from '../db';
import { DEMO_FARM_ID } from '../config';
import { t, type I18nKey } from '../i18n';
import { formatDerived } from '../i18n/format';
import { putLocal } from '../repo';
import { athensToday } from '../plantings/planting';
import { weekWater, type Part } from '../summary/water';
import type { Day } from '../weather/strip';
import type { Row } from '../db/schema';
import { nameOf } from './screens';

// Χωράφι › «Νερό αυτή την εβδομάδα»: the water lost in the last 7 days (ET0 × Kc) against the rain. Information only: no «water now», no alert. ET0 comes from the stored weather (the free source
// does not give it → «άγνωστο» with the reason); Kc is typed by the owner per crop (from the agronomist) and kept on this phone. In the Demo a fictional Kc of 1 is used.
const key = (farm: string): string => `kc:${farm}`;
const WHY: Record<'no-et0' | 'no-kc' | 'no-rain', I18nKey> = { 'no-et0': 'ui.water.why.et0', 'no-kc': 'ui.water.why.kc', 'no-rain': 'ui.water.why.rain' };
const DEMO_KC = '1';          // FICTIONAL, the Demo farm only
const kcOf = (kcs: Readonly<Record<string, string>>, id: string, demo: boolean): string | undefined => kcs[id] ?? (demo ? DEMO_KC : undefined);
const line = (label: I18nKey, p: Part): string => t('ui.water.line', { label: t(label), value: mm(p) });
const mm = (p: Part): string => (p.known ? t('ui.water.mm', { n: formatDerived(p.mm, 1) }) : t('ui.water.unknown', { why: t(WHY[p.reason]) }));

export function WaterCard({ days, crops }: { days: readonly Day[]; crops: readonly Row[] }) {
  const farm = activeFarm.value; const demo = farm === DEMO_FARM_ID;
  const [kcs, setKcs] = useState<Record<string, string>>({}); const [edit, setEdit] = useState<string>(); const [draft, setDraft] = useState('');
  useEffect(() => { void (async () => setKcs(((await db.settings.get(key(farm)))?.value as Record<string, string> | undefined) ?? {}))(); }, [farm]);
  const today = athensToday(new Date()) ?? '1970-01-01';
  const save = async (cropId: string) => { const next = { ...kcs, [cropId]: draft.trim() }; setKcs(next); await putLocal(db, key(farm), next); setEdit(undefined); };
  const rainOnly = weekWater(days, today, undefined).rain;
  return (
    <section class="card water" data-testid="water-card">
      <h3>{t('ui.water.title')}</h3>
      <p data-testid="water-rain">{line('ui.water.rain', rainOnly)}</p>
      {crops.map((c) => {
        const id = String(c.id); const kc = kcOf(kcs, id, demo);
        const w = weekWater(days, today, kc);
        return (
          <div key={id} data-testid="water-crop">
            <strong>{nameOf(c)}</strong>
            <small data-testid="water-need">{line('ui.water.need', w.need)}</small>
            <small data-testid="water-gap">{line('ui.water.gap', w.gap)}</small>
            {edit !== id && <button type="button" class="btn quiet" data-testid="water-kc-edit" onClick={() => { setDraft(kcs[id] ?? ''); setEdit(id); }}>{t('ui.water.kc.edit')}</button>}
            {edit === id && <div class="water-form">
              <label class="field"><span class="ds-muted">{t('ui.water.kc.label')}</span><input class="input" inputMode="decimal" value={draft} autoComplete="off" data-testid="water-kc" onInput={(e) => setDraft((e.target as HTMLInputElement).value)} /></label>
              <button type="button" class="btn" data-testid="water-kc-save" onClick={() => void save(id)}>{t('ui.water.kc.save')}</button>
            </div>}
          </div>
        );
      })}
      <small data-testid="water-note">{t('ui.water.note')}</small>
    </section>
  );
}
