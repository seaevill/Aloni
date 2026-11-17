import { parsePhiDays, parseReiHours, phiEnd, reiEnd } from '@aloni/rules-core';
import { formatDateTime, t, type I18nKey } from '../i18n';
import { NOT_ON_LABEL } from '../labels/label-use';
import { effectiveSprays, type Flag } from '../spray/spray';
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

/** The sprays that were recorded, newest first: who sprayed, what, when, the marks, and the waiting periods (unknown ones in red: the harvest is blocked). */
export function Sprays() {
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
          {c.rei && <small data-testid="spray-rei">{c.rei}</small>}
          <UnsyncedMark id={c.r.id} />
        </div>
      ))}
    </>
  );
}
