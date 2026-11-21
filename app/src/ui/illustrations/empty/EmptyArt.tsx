import { sizeClass } from '../../ds/size';
import ring from '../../brand/ring.json';

// The eight empty-state drawings (design sprint §1.9): the ring mark as ground (faint stones) and one motif in the same hand as the crops (2 px forest stroke, lime-soft fill).
// Decorative (aria-hidden): the headline and the sentence say everything. Motifs are drawn on a 48 grid and centred in the 160 box.
export const EMPTY_ARTS = ['parcels', 'plantings', 'stock', 'register', 'jobs', 'orders', 'offline', 'photos'] as const;
export type EmptyArt = (typeof EMPTY_ARTS)[number];
const MOTIF: Record<EmptyArt, { shapes: string; lines: string }> = {
  parcels: { shapes: 'M4 12l13-5 14 5 13-5v30l-13 5-14-5-13 5z', lines: 'M17 7v30M31 12v30' },
  plantings: { shapes: 'M24 24c-8 0-12-6-12-12 8 0 12 5 12 12zM24 28c7 0 11-5 11-11-7 0-11 4-11 11z', lines: 'M24 41V22M10 41h28' },
  stock: { shapes: 'M6 16l18-8 18 8v18l-18 8-18-8z', lines: 'M6 16l18 8 18-8M24 24v18' },
  register: { shapes: 'M10 6h26a2 2 0 012 2v32a2 2 0 01-2 2H10z', lines: 'M10 6v36M17 14h16M17 22h16M17 30h10' },
  jobs: { shapes: 'M12 9h24v33H12z', lines: 'M19 6h10v6H19zM17 25l4 4 8-9' },
  orders: { shapes: 'M6 24h36v16H6zM10 10h28v14H10z', lines: 'M6 32h36M10 17h28' },
  offline: { shapes: 'M12 35a8 8 0 010-16 11 11 0 0121-3 9 9 0 012 19z', lines: 'M6 6l36 36' },
  photos: { shapes: 'M6 16h8l3-5h14l3 5h8v24H6z', lines: 'M24 34a7 7 0 100-14 7 7 0 000 14z' },
};

/** 160 px: the faint ring ground and one motif. `size` is a CSS length. */
export function EmptyArtImage({ art, size = 'var(--empty-art)' }: { art: EmptyArt; size?: string }) {
  const m = MOTIF[art];
  return (
    <svg class={`ds-empty-art ${sizeClass(size)}`} viewBox="0 0 160 160" fill="none" aria-hidden="true" focusable="false" data-art={art}>
      <g transform="scale(1.6)">{ring.stones.map((s) => <rect key={s.rot} x={s.x} y={s.y} width={ring.stoneW} height={ring.stoneH} rx={ring.stoneRx} transform={`rotate(${s.rot} ${s.cx} ${s.cy})`} class="ds-empty-stone" />)}</g>
      <g transform="translate(40 40) scale(1.6667)"><path d={m.shapes} class="ds-crop-fill" /><path d={m.lines} class="ds-crop-line" /></g>
    </svg>
  );
}
