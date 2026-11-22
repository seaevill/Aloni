import { t } from '../i18n';
import { validBoundary, type Boundary } from '../map/geo';
import type { PlantingMark } from '../plantings/marks';
import './parcel-sketch.css';

interface Shape {
  points: string;
  kind: 'boundary' | 'rect' | 'poly';
  rotation: number;
}

function outline(boundary: Boundary): Shape | undefined {
  const ring = boundary.coordinates[0];
  const xs = ring.map(([x]) => x);
  const ys = ring.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const width = Math.max(...xs) - minX;
  const height = Math.max(...ys) - minY;
  if (width <= 0 || height <= 0) return;
  const scale = Math.min(280 / width, 150 / height);
  const points = ring.map(([x, y]) => `${170 + (x - minX - width / 2) * scale},${100 - (y - minY - height / 2) * scale}`).join(' ');
  return { points, kind: 'boundary', rotation: 0 };
}

function sampleOutline(sketch: unknown): Shape | undefined {
  if (typeof sketch !== 'object' || sketch === null) return;
  const { shape, rotation_deg: rotation } = sketch as Record<string, unknown>;
  if ((shape !== 'rect' && shape !== 'poly') || typeof rotation !== 'number' || !Number.isFinite(rotation)) return;
  const points = shape === 'poly' ? '70,50 250,35 285,125 210,165 60,150' : '60,45 280,45 280,160 60,160';
  return { points, kind: shape, rotation };
}

/** Recorded geometry takes precedence. Prototype sketches are illustrative and only rendered in Demo. */
export function ParcelSketch({ boundary, sample, decorative = false, marks = [], highlight, clipKey = 'sk' }: { boundary: unknown; sample?: unknown; decorative?: boolean; marks?: readonly PlantingMark[]; highlight?: string; clipKey?: string }) {
  const shape = validBoundary(boundary) ? outline(boundary) : sampleOutline(sample);
  if (!shape) return <span class="muted" data-testid="parcel-nosketch">{t('detail.nosketch')}</span>;
  return <svg class="sketch parcel-sketch" viewBox="0 0 340 200" role={decorative ? undefined : 'img'}
    aria-hidden={decorative ? 'true' : undefined} aria-label={decorative ? undefined : t('detail.sketch')}
    data-testid="parcel-sketch" data-shape={shape.kind}>
    <polygon points={shape.points} transform={`rotate(${shape.rotation} 170 100)`} />
    {marks.length > 0 && <SketchMarks points={shape.points} rotation={shape.rotation} marks={marks} highlight={highlight} clipKey={clipKey} />}
  </svg>;
}

/** The plantings as strips inside the parcel outline (clipped to it). Illustrative: the caption under the sketch says so. */
function SketchMarks({ points, rotation, marks, highlight, clipKey }: { points: string; rotation: number; marks: readonly PlantingMark[]; highlight?: string; clipKey: string }) {
  const xy = points.split(' ').map((p) => p.split(',').map(parseFloat));
  const xs = xy.map(([x]) => x as number); const ys = xy.map(([, y]) => y as number);
  const x0 = Math.min(...xs); const y0 = Math.min(...ys); const w = Math.max(...xs) - x0; const h = Math.max(...ys) - y0;
  const rotate = `rotate(${rotation} 170 100)`;
  return <g transform={rotate}>
    <clipPath id={`clip-${clipKey}`}><polygon points={points} /></clipPath>
    <g clip-path={`url(#clip-${clipKey})`}>
      {marks.map((m) => <rect key={m.id} class={m.id === highlight ? 'sketch-mark on' : 'sketch-mark'} data-testid="sketch-mark" data-id={m.id} x={x0 + m.from * w} y={y0} width={(m.to - m.from) * w} height={h} />)}
    </g>
  </g>;
}
