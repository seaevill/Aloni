import type { Work } from '../fieldwork/fieldwork';
import { formatDateTime, t, type I18nKey } from '../i18n';
import { formatArea, formatDerived, formatQty } from '../i18n/format';
import { parcelWater, parcelYield } from '../summary/parcel-yield';
import type { Row } from '../db/schema';

// Parcel detail: «Παραγωγικότητα» (crates per στρέμμα from the stored harvest records) and the water the owner has recorded (m³, m³ per στρέμμα). Crates stay crates: no kilograms.
// Unknown stays «άγνωστο – reason». Nothing here advises; every number comes from the records listed under «Από ποιες καταγραφές».
const YIELD_WHY: Record<string, I18nKey> = { 'no-area': 'ui.yield.why.area', 'no-records': 'ui.yield.why.records', unreadable: 'ui.yield.why.unreadable' };
const WATER_WHY: Record<string, I18nKey> = { 'no-area': 'ui.yield.why.area', 'no-records': 'ui.water.why.records', 'missing-m3': 'ui.water.why.m3' };
const one = (s: string): string => formatDerived(parseFloat(s), 1);

export function ParcelYield({ parcel, plantings, harvests, work, cropName }: { parcel: Row; work: readonly Work[]; plantings: readonly Row[]; harvests: readonly Row[]; cropName: (plantingId: string) => string }) {
  const y = parcelYield(parcel, plantings, harvests);
  const w = parcelWater(parcel, work);
  const waterWhy = w.known ? '' : t(WATER_WHY[w.reason] as I18nKey, { n: String(w.missing) });
  const lines = y.sources.map((s) => ({ id: s.id, text: [cropName(s.plantingId), formatDateTime(s.at), t('ui.yield.crates', { n: formatQty(s.crates) })].join(' · ') }));
  return (
    <section class="card" data-testid="parcel-yield">
      <h2>{t('ui.yield.title')}</h2>
      {y.known
        ? <p data-testid="yield-value"><strong>{t('ui.yield.value', { n: one(y.perStrema) })}</strong><small>{t('ui.yield.of', { crates: formatQty(String(y.crates)), area: formatArea(y.area) })}</small></p>
        : <p class="muted" data-testid="yield-unknown">{t('ui.yield.unknown', { why: t(YIELD_WHY[y.reason] as I18nKey, { n: String(y.unreadable) }) })}</p>}
      {y.sources.length > 0 && (
        <details data-testid="yield-sources">
          <summary>{t('ui.yield.sources', { n: String(y.sources.length) })}</summary>
          {lines.map((l) => <p key={l.id} class="muted" data-testid="yield-source">{l.text}</p>)}
        </details>
      )}
      <p data-testid="water-recorded">
        {w.known
          ? <><strong>{t('ui.water.value', { n: one(w.perStrema) })}</strong><small>{t('ui.water.of', { m3: formatQty(w.m3), records: String(w.records) })}</small></>
          : <span class="muted">{t('ui.water.unknown', { why: waterWhy })}</span>}
      </p>
    </section>
  );
}
