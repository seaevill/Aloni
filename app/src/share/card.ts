import ring from '../ui/brand/ring.json';
import { DRAWINGS } from '../ui/illustrations/crops/shapes';
import { parseWhole } from '@aloni/rules-core';
import type { Row } from '../db/schema';

// The share card (design sprint D13): ONE 1080 x 1350 picture the owner chooses to post. It is built from an input that has room for EXACTLY these things and nothing else:
// the app name, the date, up to three crop drawings, one number of crates LOGGED this week with its caption, an optional handle line and (Demo) the burned-in demo line.
// Worker names, parcel names, location, spray, product, dose, client and price data have no field here, so they cannot reach the picture. No network address, no script, no embedded image.
export interface ShareInput {
  name: string;
  dateText: string;
  /** The logged crates of the week as text; undefined = unknown: then the number AND its caption are left out (never a 0). */
  cratesText: string | undefined;
  cropSlugs: readonly string[];
  handle: string;
  demo: boolean;
  captions: { crates: string; demo: string };
}
const W = 1080, H = 1350, FOREST = '#134a2b', LIME = '#c6f062', SOFT = '#eaf8c4', SAGE = '#edf2e8', AMBER = '#ffedc2', AMBER_INK = '#432c00', INK = '#0e1c12';
const FONT = 'Commissioner, system-ui, -apple-system, Segoe UI, sans-serif';
export const HANDLE_MAX = 40;
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const markSvg = (x: number, y: number, size: number): string => {
  const k = size / 100;
  const stones = ring.stones.map((s) => `<rect x="${s.x}" y="${s.y}" width="${ring.stoneW}" height="${ring.stoneH}" rx="${ring.stoneRx}" transform="rotate(${s.rot} ${s.cx} ${s.cy})" fill="${LIME}" stroke="${FOREST}" stroke-width="1.5"/>`).join('');
  return `<g transform="translate(${x} ${y}) scale(${k})">${stones}<circle cx="50" cy="50" r="${ring.disc}" fill="${FOREST}"/></g>`;
};
const cropSvg = (slug: string, x: number, y: number, size: number): string => {
  const d = DRAWINGS[slug];
  if (!d) return '';
  return `<g data-crop="${slug}" transform="translate(${x} ${y}) scale(${size / 48})" fill="none" stroke="${FOREST}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d.shapes}" fill="${SOFT}"/>${d.lines === '' ? '' : `<path d="${d.lines}"/>`}</g>`;
};

export function shareCardSvg(i: ShareInput): string {
  const crops = i.cropSlugs.filter((s) => s in DRAWINGS).slice(0, 3);
  const handle = i.handle.trim().slice(0, HANDLE_MAX);
  const tile = 300, gap = 40;
  const rowW = crops.length * tile + (crops.length - 1) * gap;   // the row of tiles (one tile: no gap)
  const startX = (W - rowW) / 2;
  const tiles = crops.map((slug, n) => `<rect x="${startX + n * (tile + gap)}" y="440" width="${tile}" height="${tile}" rx="48" fill="${SOFT}"/>${cropSvg(slug, startX + n * (tile + gap) + 20, 460, tile - 40)}`).join('');
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${SAGE}"/>`,
    markSvg(60, 60, 180),
    `<text x="270" y="170" font-family="${FONT}" font-size="96" font-weight="800" fill="${FOREST}">${esc(i.name)}</text>`,
    `<text x="270" y="230" font-family="${FONT}" font-size="44" font-weight="600" fill="${INK}">${esc(i.dateText)}</text>`,
    tiles,
  ];
  if (i.cratesText !== undefined) {
    parts.push(`<text x="540" y="1040" text-anchor="middle" font-family="${FONT}" font-size="240" font-weight="800" fill="${INK}">${esc(i.cratesText)}</text>`);
    parts.push(`<text x="540" y="1110" text-anchor="middle" font-family="${FONT}" font-size="48" font-weight="600" fill="${INK}">${esc(i.captions.crates)}</text>`);
  }
  if (i.demo) parts.push(`<rect x="0" y="1230" width="${W}" height="120" fill="${AMBER}"/><text x="540" y="1305" text-anchor="middle" font-family="${FONT}" font-size="46" font-weight="800" fill="${AMBER_INK}">${esc(i.captions.demo)}</text>`);
  if (handle !== '') parts.push(`<text x="60" y="${i.demo ? 1190 : 1300}" font-family="${FONT}" font-size="40" font-weight="600" fill="${FOREST}">${esc(handle)}</text>`);
  parts.push('</svg>');
  return parts.join('');
}

/** The crops with the most crates LOGGED in the last 7 days (largest first, ties by name; a crop without a readable crate count is not listed). */
export function topCropSlugs(harvests: readonly Row[], plantings: readonly Row[], crops: readonly Row[], nowIso: string, n: number): string[] {
  const since = new Date(Date.parse(nowIso) - 7 * 86_400_000).toISOString();
  const sums = new Map<string, number>();
  for (const h of harvests) {
    const c = parseWhole<'Crates'>(typeof h.crates_str === 'string' ? h.crates_str : '');
    const at = typeof h.harvested_at === 'string' ? h.harvested_at : '';
    if (!c.known || at < since || at > nowIso || c.value <= 0) continue;
    const slug = crops.find((x) => x.id === plantings.find((p) => p.id === h.planting_id)?.crop_id)?.slug;
    if (typeof slug !== 'string') continue;
    const before = sums.get(slug);
    if (before === undefined) sums.set(slug, c.value); else sums.set(slug, before + c.value);
  }
  return [...sums.entries()].sort((a, b) => { if (a[1] !== b[1]) return b[1] - a[1]; return a[0].localeCompare(b[0]); }).slice(0, n).map(([s]) => s);
}
