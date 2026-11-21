// One icon set on a 24 px grid: 2 px stroke, round caps and joins, currentColor, no fills (design sprint §1.6). Drawn here, original. D5 adds the rest of the set.
export const ICON_PATHS = {
  hourglass: 'M7 3h10M7 21h10M8 3v4l4 5-4 5v4M16 3v4l-4 5 4 5v4',
  lock: 'M5 11h14v10H5zM8 11V8a4 4 0 018 0v3',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2',
  'pen-off': 'M4 20l1-4 11-11 3 3-11 11zM3 3l18 18',
  snowflake: 'M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9',
  sickle: 'M5 19C5 10 10 5 19 5c-1 7-5 12-12 12M5 19l-1 2',
  question: 'M12 3a9 9 0 100 18 9 9 0 000-18zM9.5 9.5a2.5 2.5 0 114 2c-1 .6-1.5 1.2-1.5 2M12 17h.01',
  info: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 11v6M12 7.5h.01',
} as const;
export type IconName = keyof typeof ICON_PATHS;

/** Decorative by default (aria-hidden): a word always sits next to it. `size` is a CSS length from tokens (--icon-sm / --icon-md). */
export function Icon({ name, size = 'var(--icon-md)' }: { name: IconName; size?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" data-icon={name}>
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
