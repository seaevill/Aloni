import { sizeClass } from '../../ds/size';
import { DRAWINGS } from './shapes';

const LEAF = { shapes: 'M7 41C7 22 19 9 41 7c0 22-12 34-34 34z', lines: 'M7 41L27 21' };   // the neutral leaf for a slug without a drawing

/** One crop's small hand drawing. Decorative (aria-hidden): the crop's NAME is always printed beside it. `size` is a CSS length (a token or a calc of one). A slug without a drawing gets a neutral leaf. */
export function CropIcon({ slug, size = 'var(--tile)' }: { slug: string; size?: string }) {
  const d = DRAWINGS[slug] ?? LEAF;
  return (
    <svg class={`ds-crop ${sizeClass(size)}`} viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false" data-crop={slug}>
      <path d={d.shapes} class="ds-crop-fill" />
      {d.lines !== '' && <path d={d.lines} class="ds-crop-line" />}
    </svg>
  );
}
