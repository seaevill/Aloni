// 17 original crop drawings (design sprint §1.7). Each is a 48 px viewBox: `shapes` = outlined AND filled (lime-soft), `lines` = stroke only. One 2 px forest stroke, ONE fill colour, a slightly irregular hand line.
// Drawn by hand for this app: no traced or generated artwork. Decorative only (aria-hidden); the crop name is always printed beside them. They never stand for health, disease or readiness.
export interface Drawing { shapes: string; lines: string }
const D = (shapes: string, lines = ''): Drawing => ({ shapes, lines });

export const DRAWINGS: Record<string, Drawing> = {
  spinach: D('M24 5c6 5 10 12 8 21-3 4-8 7-8 7s-5-3-8-7c-2-9 2-16 8-21zM9 19c5-1 10 2 12 8l-5 6c-5-1-9-5-10-9zM39 19c-5-1-10 2-12 8l5 6c5-1 9-5 10-9z', 'M24 9v32M24 41v4'),
  rocket: D('M24 5c4 2 5 5 4 8 4-1 8 1 7 5-2 2-4 3-6 3 3 1 6 3 5 6-3 2-7 2-9 0v10h-2V27c-2 2-6 2-9 0-1-3 2-5 5-6-3 0-5-1-7-3-1-4 3-6 7-5-1-3 0-6 5-8z', 'M24 27v17'),
  parsley: D('M24 5c4 0 6 3 4 6-2 2-6 2-8 0-2-3 1-6 4-6zM11 20c3-3 8-2 8 2-1 4-5 5-8 3-2-2-2-4 0-5zM37 20c-3-3-8-2-8 2 1 4 5 5 8 3 2-2 2-4 0-5z', 'M24 12v30M24 29l-9-7M24 29l9-7'),
  dill: D('M9 13c5-7 25-7 30 0-7 4-23 4-30 0z', 'M24 42V16M24 16L12 12M24 16l12-4M24 34l-8-3M24 34l8-3M24 27l-7-3M24 27l7-3M12 12v-2M36 12v-2M24 16v-9'),
  coriander: D('M24 6c3-2 7 0 6 4 4-1 6 3 4 6 3 2 2 7-2 8 1 4-3 7-6 5-3 3-7 1-7-3-4 0-6-4-3-7-3-3-1-7 3-8-1-4 2-7 5-5zM24 33c-3 0-6 3-6 7 4 1 8-1 6-7z', 'M24 24v18'),
  chicory: D('M24 41L9 29l5-1-3-5 6 1-1-6 6 3 1-7 5 6 5-6 1 7 6-3-1 6 6-1-3 5 5 1z', 'M24 41V19M24 41L14 25M24 41l10-16'),
  endive: D('M7 31c2-5 5-7 7-4 2-5 5-6 7-3 3-5 7-4 8 1 3-3 5-1 6 3 3-2 5 1 5 5 0 6-9 10-20 10S7 36 7 31z', 'M15 31c2-3 4-3 6 0M24 28c2-4 4-4 5 0M31 32c2-2 3-2 5 0M24 41v-6'),
  chard: D('M24 5c11 4 15 15 10 25-3 6-7 9-10 13-3-4-7-7-10-13C9 20 13 9 24 5z', 'M24 7v38M23 12v30M24 18l8-4M24 26l8-4M24 18l-8-4M24 26l-8-4'),
  onion: D('M17 9h4v20h-4zM22 5h4v24h-4zM27 9h4v20h-4zM24 26c7 0 11 5 11 9s-5 8-11 8-11-4-11-8 4-9 11-9z', 'M22 43l-1 4M26 43l2 4'),
  leek: D('M24 27L9 6c7 0 13 7 15 21zM24 27V4c4 7 4 16 0 23zM24 27L39 6c-7 0-13 7-15 21zM19 27h10v15H19z', 'M22 42l-1 5M26 42l1 5M19 33h10'),
  vlita: D('M9 25c4-8 13-9 17-4-4 8-11 10-17 4zM39 27c-4-8-11-9-15-4 4 8 9 10 15 4zM24 8a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM21 12a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM27 12a1.5 1.5 0 100 3 1.5 1.5 0 000-3z', 'M24 43V16M24 31l-7-3M24 34l8-3'),
  kaukalithra: D('M8 41c0-9 4-15 11-17 3 2 3 5 0 8 4-1 6 1 7 4 3-2 6-1 7 3 1 3-1 6-5 6H8zM24 6a2 2 0 100 4 2 2 0 000-4zM17 9a2 2 0 100 4 2 2 0 000-4zM31 9a2 2 0 100 4 2 2 0 000-4z', 'M24 24V10M24 14l-6-3M24 14l6-3'),
  cabbage: D('M24 7a16 16 0 100 32 16 16 0 000-32zM5 31c0-8 4-14 10-18-2 9-1 17 5 24-7 0-14-2-15-6z', 'M24 7c-7 7-7 25 0 32M24 7c7 7 7 25 0 32M9 23h30'),
  myroni: D('M24 6c-8 4-11 20 0 36 11-16 8-32 0-36z', 'M24 42V10M24 15l-7-4M24 15l7-4M24 21l-8-4M24 21l8-4M24 27l-9-4M24 27l9-4M10 41l9-7M38 41l-9-7'),
  beet: D('M24 21c9 0 14 6 14 12s-6 11-14 11-14-5-14-11 5-12 14-12z', 'M24 21V6M24 21L15 8M24 21l9-13M24 6l-3 3M15 8l-3 2M33 8l3 2M24 44l1 4'),
  radish: D('M24 17c8 0 13 5 13 11s-6 12-13 14c-7-2-13-8-13-14s5-11 13-11zM24 17c-3-5-8-7-13-5 2 6 8 8 13 5zM24 17c3-5 8-7 13-5-2 6-8 8-13 5z', 'M24 42l1 6'),
  celery: D('M13 18h7l-1 24h-5zM21 14h7l1 28h-6zM29 18h7l-1 24h-5zM11 18c0-7 4-11 9-11 0 6-3 10-9 11zM21 14c0-7 4-11 8-11 2 7-1 11-8 11zM29 18c0-6 4-10 8-11 1 6-2 10-8 11z', 'M17 22v16M24 18v20M32 22v16'),
};
