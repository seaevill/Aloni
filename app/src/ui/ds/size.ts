// SVG sizes by CLASS, never by a width/height attribute holding var(): WebKit logs «Invalid value for <svg> attribute width="var(--icon-md)"» and the e2e console check fails.
// The callers keep passing the token strings; they map to the classes in ds.css. An unknown string gets no class (the SVG then has no size: loud in review, never a wrong one).
const CLASS: Record<string, string> = {
  'var(--icon-sm)': 'ds-size-sm', 'var(--icon-md)': 'ds-size-md', 'var(--tile)': 'ds-size-tile',
  'calc(var(--tile) - var(--sp-16))': 'ds-size-inner', 'var(--thumb)': 'ds-size-thumb', 'var(--empty-art)': 'ds-size-art',
};
export const sizeClass = (size: string): string => CLASS[size] ?? '';
