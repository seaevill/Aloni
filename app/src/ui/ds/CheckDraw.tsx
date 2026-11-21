/** The «Έγινε» check, drawn in 280 ms. Mount it ONLY AFTER the write is committed: the record never waits for the animation. Decorative (the word «Έγινε» is beside it). */
export function CheckDraw() {
  return (
    <svg class="m-check ds-size-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" data-testid="check-draw">
      <path d="M5 12.5l4.5 4.5L19 7" pathLength="1" />
    </svg>
  );
}
