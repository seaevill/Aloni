import { useState } from 'preact/hooks';
import { t } from '../i18n';
import { formatDerived } from '../i18n/format';
import { areaM2, toStremma, typedStremma, type Boundary } from '../map/geo';
import { readPin } from '../parcels/pin';
import { accuracyOverlaps, validFix, walkedBoundary } from '../parcels/walk';
import type { Pin } from '../parcels/parcel';
import { PageHead } from './ds';

export function ParcelWalk({ typedArea, onCancel, onDone }: {
  typedArea: string; onCancel: () => void; onDone: (boundary: Boundary) => void;
}) {
  const [points, setPoints] = useState<Pin[]>([]);
  const [busy, setBusy] = useState(false);
  const [fix, setFix] = useState<{ accuracy?: number; rejected?: boolean }>();
  const shape = walkedBoundary(points);
  const area = areaM2(shape);
  const typed = typedStremma(typedArea);
  const accuracy = (value: number) => t('ui.walk.accuracy', { n: formatDerived(value, 2) });
  const add = async () => {
    setBusy(true);
    try {
      const reading = await readPin();
      if (!reading.known || !validFix(reading.value)) { setFix({}); return; }
      const next = reading.value;
      const previous = points.at(-1);
      const rejected = previous !== undefined && accuracyOverlaps(previous, next);
      setFix({ accuracy: next.accuracy_m, rejected });
      if (!rejected) setPoints([...points, next]);
    } catch {
      setFix({});
    } finally {
      setBusy(false);
    }
  };
  return <section data-testid="parcel-walk">
    <PageHead heading={t('ui.walk.title')} back={onCancel} backText={t('info.back')} />
    <p>{t('ui.walk.help')}</p>
    <button type="button" class="btn" data-testid="parcel-walk-point" disabled={busy} onClick={() => void add()}>{t('ui.walk.add')}</button>
    {busy && <p role="status">{t('ui.walk.reading')}</p>}
    {fix && !busy && <p role="status" data-testid="parcel-walk-reading">
      {fix.accuracy === undefined ? t('ui.walk.missing') : accuracy(fix.accuracy)}
    </p>}
    {fix?.rejected && <p class="msg" role="alert" data-testid="parcel-walk-rejected">{t('ui.walk.poor')}</p>}
    <ol>{points.map((point) => <li key={`${point.lng},${point.lat}`}>{accuracy(point.accuracy_m)}</li>)}</ol>
    {points.length > 0 && <button type="button" class="btn secondary" disabled={busy} onClick={() => {
      setPoints(points.slice(0, -1)); setFix(undefined);
    }}>{t('ui.walk.undo')}</button>}
    <p data-testid="parcel-walk-area">{area === undefined ? t('ui.walk.areaMissing') : t('map.area.line', { map: formatDerived(toStremma(area), 2) })}</p>
    <p>{t('ui.walk.typed', { area: typed === undefined ? t('ui.walk.unknown') : typedArea })}</p>
    <button type="button" class="btn" data-testid="parcel-walk-use" disabled={!shape || busy}
      onClick={() => { if (shape) onDone(shape); }}>{t('ui.walk.use')}</button>
  </section>;
}
