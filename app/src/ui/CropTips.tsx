import { useEffect, useState } from 'preact/hooks';
import { lang, t } from '../i18n';
import type { CropContent, CropLocale } from '../content/crops';
import { DetailSheet, SheetFact } from './ds';
import { useRows } from './useRows';
import { SowRing } from './SowRing';

const LOCALES: readonly string[] = ['el', 'tr', 'en'];
const localeOf = (l: string): CropLocale => (LOCALES.includes(l) ? (l as CropLocale) : 'en');

/** General crop information from the reviewed content library (history, facts, handling, strengths, usual problems). Information only: no product, no dose, no instruction to spray; sources are in docs/content/sources.md. */
export function CropTips({ slug, onClose }: { slug: string; onClose: () => void }) {
  const crops = useRows('crops'); const plantings = useRows('plantings');
  const cropId = (crops.rows ?? []).find((c) => c.slug === slug)?.id;
  const sown = (plantings.rows ?? []).filter((p) => p.crop_id === cropId && !p.deleted_at).map((p) => (typeof p.sown_on === 'string' ? p.sown_on : ''));
  // the texts are their own chunk (not in the first load): they are fetched when the card opens
  const [c, setC] = useState<CropContent | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    void import('../content/crops').then((m) => { if (live) { setC(m.cropContent(slug, localeOf(lang.value))); setLoaded(true); } }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [slug, lang.value]);
  return (
    <DetailSheet heading={t('ui.crop.tips')} onClose={onClose} testid="crop-tips">
      <p class="muted" data-testid="crop-tips-note">{t('ui.crop.tips.note')}</p>
      {failed && <p class="muted" role="alert" data-testid="crop-tips-failed">{t('ui.crop.tips.failed')}</p>}
      {loaded && c === undefined && <p class="muted">{t('ui.crop.tips.none')}</p>}
      <SowRing days={sown} />
      {c !== undefined && <>
        <h3>{t('ui.crop.tips.history')}</h3>
        <p>{c.history}</p>
        <h3>{t('ui.crop.tips.facts')}</h3>
        <ul>{c.facts.map((f) => <li key={f} data-testid="crop-tips-fact">{f}</li>)}</ul>
        <h3>{t('ui.crop.tips.handling')}</h3>
        <p>{c.tips}</p>
        <SheetFact name={t('ui.crop.tips.strength')} value={c.strength} />
        <SheetFact name={t('ui.crop.tips.weakness')} value={c.weakness} />
        <h3>{t('ui.crop.tips.problems')}</h3>
        <ul>{c.problems.map((p) => <li key={p}>{p}</li>)}</ul>
      </>}
    </DetailSheet>
  );
}
