import { t } from '../i18n';
import { validBoundary, type Boundary } from '../map/geo';
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
export function ParcelSketch({ boundary, sample, decorative = false }: { boundary: unknown; sample?: unknown; decorative?: boolean }) {
  const shape = validBoundary(boundary) ? outline(boundary) : sampleOutline(sample);
  if (!shape) return <span class="muted" data-testid="parcel-nosketch">{t('detail.nosketch')}</span>;
  return <svg class="sketch parcel-sketch" viewBox="0 0 340 200" role={decorative ? undefined : 'img'}
    aria-hidden={decorative ? 'true' : undefined} aria-label={decorative ? undefined : t('detail.sketch')}
    data-testid="parcel-sketch" data-shape={shape.kind}>
    <polygon points={shape.points} transform={`rotate(${shape.rotation} 170 100)`} />
  </svg>;
}
