// One icon set on a 24 px grid: 2 px stroke, round caps and joins, currentColor, no fills (design sprint §1.6). Drawn here, original. D5 adds the rest of the set.
import { sizeClass } from '../ds/size';

export const ICON_PATHS = {
  hourglass: 'M7 3h10M7 21h10M8 3v4l4 5-4 5v4M16 3v4l-4 5 4 5v4',
  lock: 'M5 11h14v10H5zM8 11V8a4 4 0 018 0v3',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2',
  'pen-off': 'M4 20l1-4 11-11 3 3-11 11zM3 3l18 18',
  snowflake: 'M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9',
  sickle: 'M5 19C5 10 10 5 19 5c-1 7-5 12-12 12M5 19l-1 2',
  question: 'M12 3a9 9 0 100 18 9 9 0 000-18zM9.5 9.5a2.5 2.5 0 114 2c-1 .6-1.5 1.2-1.5 2M12 17h.01',
  info: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 11v6M12 7.5h.01',
  chevron: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  today: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z',
  crops: 'M5 19C5 10 11 5 19 5c0 8-5 14-14 14zM5 19l8-8',
  parcels: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14',
  stock: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  bell: 'M6 17V11a6 6 0 0112 0v6l1.5 2h-15zM10 21a2 2 0 004 0',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7',
  'x-mark': 'M6 6l12 12M18 6L6 18',
  wind: 'M3 9h11a3 3 0 10-3-3M3 14h15a3 3 0 11-3 3M3 19h7',
  rain: 'M7 16a4 4 0 010-8 5 5 0 019.5 1A3.5 3.5 0 0116.5 16M8 19l-1 2M12 19l-1 2M16 19l-1 2',
  drop: 'M12 3c4 5 6 8 6 11a6 6 0 01-12 0c0-3 2-6 6-11z',
  thermometer: 'M10 14V5a2 2 0 014 0v9a4 4 0 11-4 0z',
  crate: 'M3 8h18v12H3zM3 8l2-4h14l2 4M9 12h6',
  sprayer: 'M8 9h8v12H8zM10 9V6h4v3M14 6h4l2-2M20 8l1 1M20 12l1-1',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 100-7 3.5 3.5 0 000 7z',
  share: 'M12 15V4M8 8l4-4 4 4M5 12v8h14v-8',
  export: 'M12 4v11M8 11l4 4 4-4M5 20h14',
  print: 'M7 9V4h10v5M7 17H4v-7h16v7h-3M7 14h10v6H7z',
  users: 'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2 20c0-4 3-6 7-6s7 2 7 6M16 4.5a3.5 3.5 0 010 6.5M18 14c2.5.5 4 2.5 4 6',
  worker: 'M12 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM5 20c0-4 3-6 7-6s7 2 7 6M7 6h10',
  photo: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01',
  calendar: 'M4 6h16v14H4zM4 11h16M8 3v4M16 3v4',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z',
  sync: 'M20 8a8 8 0 00-14-2M4 4v4h4M4 16a8 8 0 0014 2M20 20v-4h-4',
  offline: 'M3 3l18 18M8 10a8 8 0 0111 2M5 13a11 11 0 013-2M9 17a4 4 0 016 0M12 20h.01',
} as const;
export type IconName = keyof typeof ICON_PATHS;

/** Decorative by default (aria-hidden): a word always sits next to it. `size` is a CSS length from tokens (--icon-sm / --icon-md). */
export function Icon({ name, size = 'var(--icon-md)' }: { name: IconName; size?: string }) {
  return (
    <svg class={sizeClass(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" data-icon={name}>
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
