import { APP_NAME, APP_NAME_EL } from '../../config';
import { sizeClass } from '../ds/size';
import ring from './ring.json';

/** The mark: a ring of 12 rounded «stones» (an αλώνι, the circular threshing floor) round a forest centre disc. Lime stones, 1.5 px forest seams. PROVISIONAL like the name: one geometry file (ring.json) and one component. */
export function Mark({ size = 'var(--tile)' }: { size?: string }) {
  return (
    <svg class={`ds-mark ${sizeClass(size)}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {ring.stones.map((s) => <rect key={s.rot} x={s.x} y={s.y} width={ring.stoneW} height={ring.stoneH} rx={ring.stoneRx} transform={`rotate(${s.rot} ${s.cx} ${s.cy})`} class="ds-mark-stone" />)}
      <circle cx="50" cy="50" r={ring.disc} class="ds-mark-disc" />
    </svg>
  );
}

/** The app name in Commissioner 800 (the name comes from config.ts only). The Latin name sits below ONLY in store contexts (`latin`). */
export function Wordmark({ latin = false }: { latin?: boolean }) {
  return (
    <span class="ds-wordmark">
      <span class="ds-wordmark-el">{APP_NAME_EL}</span>
      {latin && <span class="ds-wordmark-latin">{APP_NAME}</span>}
    </span>
  );
}
