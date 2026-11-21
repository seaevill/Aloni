import { useState } from 'preact/hooks';
import { t } from '../i18n';
import { formatDerived } from '../i18n/format';
import type { Boundary, Ring } from '../map/geo';
import { closePlantingSketch } from '../plantings/sketch-geom';
import { Card, SectionHead } from './ds';
import './planting-sketch-v2.css';

const box = 100;

export function PlantingSketchDraw({ parcel }: { parcel: Boundary }) {
  const [vertices, setVertices] = useState<Ring>([]);
  const [closed, setClosed] = useState(false);
  const ring = parcel.coordinates[0];
  const left = Math.min(...ring.map(([x]) => x));
  const bottom = Math.min(...ring.map(([, y]) => y));
  const side = Math.max(Math.max(...ring.map(([x]) => x)) - left, Math.max(...ring.map(([, y]) => y)) - bottom);
  const points = (path: Ring) => path.map(([x, y]) => `${(x - left) / side * box},${box - (y - bottom) / side * box}`).join(' ');
  const check = closed ? closePlantingSketch(parcel, vertices) : undefined;
  if (side <= 0) return null;
  return <Card testid="planting-sketch-draw">
    <SectionHead heading={t('detail.sketch')} />
    <button type="button" class="planting-draw-pad" aria-label={t('detail.sketch')} disabled={closed} onClick={(e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.detail === 0 ? 0.5 : (e.clientX - rect.left) / rect.width;
      const y = e.detail === 0 ? 0.5 : (e.clientY - rect.top) / rect.height;
      setVertices([...vertices, [left + x * side, bottom + (1 - y) * side]]);
    }}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <polygon class="planting-draw-parcel" points={points(ring)} />
        {closed ? <polygon class="planting-draw-line" points={points(vertices)} /> : <polyline class="planting-draw-line" points={points(vertices)} />}
      </svg>
    </button>
    <div class="seg two">
      <button type="button" disabled={vertices.length === 0} onClick={() => { setVertices(vertices.slice(0, -1)); setClosed(false); }}>{t('toast.undo')}</button>
      <button type="button" disabled={closed || vertices.length < 3} onClick={() => setClosed(true)}>{t('photos.close')}</button>
    </div>
    {check?.ok && <p data-testid="planting-sketch-area">{t('map.area.line', { map: formatDerived(check.stremma, 2) })}</p>}
    {check && !check.ok && <p role="alert">{t('map.area.none')}</p>}
    <p class="muted">{t('map.keep')}</p>
  </Card>;
}
