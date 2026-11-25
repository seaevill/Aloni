import { useEffect, useState } from 'preact/hooks';
import { activeFarm, dataVersion, db } from '../db';
import { serverFieldOn } from '../owner-records/mode';
import { loadWork, type Work } from '../fieldwork/fieldwork';
import { formatDateTime, t, type I18nKey } from '../i18n';
import { formatArea, formatDerived, formatQty } from '../i18n/format';
import { parcelWater, parcelYield } from '../summary/parcel-yield';
import type { Row } from '../db/schema';

// Parcel detail: «Παραγωγικότητα» (crates per στρέμμα from the stored harvest records) and the water the owner has recorded (m³, m³ per στρέμμα). Crates stay crates: no kilograms.
// Unknown stays «άγνωστο – reason». Nothing here advises; every number comes from the records listed under «Από ποιες καταγραφές».
const YIELD_WHY: Record<string, I18nKey> = { 'no-area': 'ui.yield.why.area', 'no-records': 'ui.yield.why.records', unreadable: 'ui.yield.why.unreadable' };
const WATER_WHY: Record<string, I18nKey> = { 'no-area': 'ui.yield.why.area', 'no-records': 'ui.water.why.records', 'missing-m3': 'ui.water.why.m3' };
const one = (s: string): string => { const v = parseFloat(s); return v > 0 && v < 0.1 ? `<${formatDerived(0.1, 1)}` : formatDerived(v, 1); };   // a small non-zero value is never shown as 0

export function ParcelYield({ parcel, plantings, harvests, cropName, cropById }: { parcel: Row; plantings: readonly Row[]; harvests: readonly Row[]; cropName: (plantingId: string) => string; cropById: (cropId: string) => string }) {
  const farm = activeFarm.value;
  const [work, setWork] = useState<Work[]>([]); const [onServer, setOnServer] = useState(false);
  useEffect(() => { void loadWork(db, farm).then(setWork); void serverFieldOn(db, farm).then(setOnServer); }, [farm, parcel.id, dataVersion.value]);
  const y = parcelYield(parcel, plantings, harvests);
  const w = parcelWater(parcel, work);
  const waterWhy = w.known ? '' : t(WATER_WHY[w.reason] as I18nKey, { n: String(w.missing) });
  const lines = y.sources.map((s) => ({ id: s.id, text: [cropName(s.plantingId), formatDateTime(s.at), t('ui.yield.crates', { n: formatQty(s.crates) }), s.archived ? t('ui.yield.archived.tag') : ''].filter((x) => x !== '').join(' · ') }));
  const byCropLines = y.known ? y.byCrop.map((c) => ({ id: c.cropId, text: t('ui.yield.crop.line', { crop: cropById(c.cropId), n: one(c.perStrema), crates: formatQty(String(c.crates)) }) })) : [];
  return (
    <section class="card" data-testid="parcel-yield">
      <h2>{t('ui.yield.title')}</h2>
      {y.known
        ? <p data-testid="yield-value"><strong>{t('ui.yield.value', { n: one(y.perStrema) })}</strong><small>{t('ui.yield.of', { crates: formatQty(String(y.crates)), area: formatArea(y.area) })}</small><small>{t('ui.yield.scope')}</small></p>
        : <p class="muted" data-testid="yield-unknown">{t('ui.yield.unknown', { why: t(YIELD_WHY[y.reason] as I18nKey, { n: String(y.unreadable) }) })}</p>}
      {y.known && y.archivedCrates > 0 && <p class="muted" data-testid="yield-archived">{t('ui.yield.archived', { n: formatQty(String(y.archivedCrates)) })}</p>}
      {y.known && y.byCrop.length > 0 && (
        <details class="fold" data-testid="yield-bycrop">
          <summary>{t('ui.yield.bycrop')}</summary>
          {byCropLines.map((l) => <p key={l.id} class="muted" data-testid="yield-crop">{l.text}</p>)}
        </details>
      )}
      {y.sources.length > 0 && (
        <details class="fold" data-testid="yield-sources">
          <summary>{t('ui.yield.sources', { n: String(y.sources.length) })}</summary>
          {lines.map((l) => <p key={l.id} class="muted" data-testid="yield-source">{l.text}</p>)}
        </details>
      )}
      <p data-testid="water-recorded">
        {w.known
          ? <><strong>{t('ui.water.value', { n: one(w.perStrema) })}</strong><small>{t('ui.water.of', { m3: formatQty(w.m3), records: String(w.records) })}</small><small>{t('ui.water.caveat')}</small></>
          : <span class="muted">{t('ui.water.rec.unknown', { why: waterWhy })}</span>}
      </p>
      {w.records > 0 && !onServer && <p class="muted" data-testid="water-local">{t('ui.work.local')}</p>}
    </section>
  );
}
