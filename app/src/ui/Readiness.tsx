import { useEffect, useState } from 'preact/hooks';
import { dataVersion, db, realFarmId } from '../db';
import { t, type I18nKey } from '../i18n';
import { loadController } from '../legal/controller';
import { putSetting } from '../repo';
import { BUSINESS_KEY, EXPECTED_MIGRATION, READINESS_KEY, readinessOf, type Business, type Confirmed, type ReadinessKey } from '../settings/readiness';
import type { Controller } from '../legal/controller';

const GAP = ' ';
const DEV: ReadonlySet<ReadinessKey> = new Set<ReadinessKey>(['migration', 'advisor']);
const LABELS: Record<ReadinessKey, I18nKey> = {
  controller: 'ready.controller', farm_name: 'ready.farm_name', vat: 'ready.vat', migration: 'ready.migration', advisor: 'ready.advisor',
};

/** Settings → «Σύνδεση λογαριασμού»: a checklist of what is still missing before sign-in and sync may be switched on. It lists; it never switches anything on. */
export function Readiness({ part }: { part: 'owner' | 'dev' }) {
  const [controller, setController] = useState<Controller | undefined>(undefined);
  const [business, setBusiness] = useState<Business | undefined>(undefined);
  const [confirmed, setConfirmed] = useState<Confirmed | undefined>(undefined);
  const [farmName, setFarmName] = useState('');
  const ver = dataVersion.value;      // both halves re-read when either one saves
  useEffect(() => {
    void loadController(db).then(setController);
    void db.settings.get(BUSINESS_KEY).then((r) => { const b = r?.value as Business | undefined; setBusiness(b); setFarmName(b?.farm_name ?? ''); });
    void db.settings.get(READINESS_KEY).then((r) => setConfirmed(r?.value as Confirmed | undefined));
  }, [ver]);
  const title = t(part === 'dev' ? 'ready.title.dev' : 'ready.title');
  const r = readinessOf({ controller, business, confirmed });
  const missing = r.items.filter((i) => !i.ok).length;
  const saveConfirmed = async (next: Confirmed) => { await putSetting(db, realFarmId.value, READINESS_KEY, next); setConfirmed(next); dataVersion.value++; };
  const saveFarmName = async () => { const next: Business = { ...business, farm_name: farmName.trim() }; await putSetting(db, realFarmId.value, BUSINESS_KEY, next); setBusiness(next); dataVersion.value++; };
  const ok = (k: ReadinessKey) => r.items.find((i) => i.key === k)?.ok === true;
  return (
    <section class="card" data-testid={part === 'dev' ? 'readiness-dev' : 'readiness'}>
      <strong>{title}</strong>
      <ul class="checklist">
        {r.items.filter((i) => DEV.has(i.key) === (part === 'dev')).map((i) => {
          const look = i.ok ? { cls: 'badge signed', word: t('ready.ok') } : { cls: 'badge blocked', word: t('ready.missing') };
          return <li key={i.key} data-testid={`ready-${i.key}`} data-ok={i.ok ? 'yes' : 'no'}><span class={look.cls}>{look.word}</span>{GAP}{t(LABELS[i.key])}</li>;
        })}
      </ul>
      {part === 'owner' && !ok('farm_name') && (
        <>
          <label class="field">{t('ready.farm_name.input')}<input class="input" value={farmName} autoComplete="off" data-testid="ready-farm-input" onInput={(e) => setFarmName((e.target as HTMLInputElement).value)} /></label>
          <button class="btn secondary" data-testid="ready-farm-set" onClick={() => void saveFarmName()}>{t('product.save')}</button>
        </>
      )}
      {part === 'dev' && !ok('migration') && <button class="btn secondary" data-testid="ready-migration-confirm" onClick={() => void saveConfirmed({ ...confirmed, migration: EXPECTED_MIGRATION })}>{t('ready.migration.confirm', { v: EXPECTED_MIGRATION })}</button>}
      {part === 'dev' && !ok('advisor') && <button class="btn secondary" data-testid="ready-advisor-confirm" onClick={() => void saveConfirmed({ ...confirmed, advisor: true })}>{t('ready.advisor.confirm')}</button>}
      {part === 'dev' && <p class={r.ready ? 'msg' : 'muted'} data-testid="ready-summary">{r.ready ? t('ready.all') : t('ready.some', { n: missing })}</p>}
    </section>
  );
}
