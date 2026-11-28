import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Row } from '../../src/db/schema';
import { shareCardSvg, topCropSlugs, type ShareColors, type ShareInput } from '../../src/share/card';

// D13: the share card shows ONLY: the app name and ring, the date, up to three crop drawings, one logged-crates number with its caption, an optional handle, and (Demo) the burned-in demo line.
// Worker names, parcel names, location, spray, product, dose, client and price data are excluded BY CONSTRUCTION: the builder's input type has no place for them.
// The colours come from tokens.css, as readShareColors reads them in the browser (card.ts holds no colour literal).
const tokenCss = readFileSync(new URL('../../src/ui/tokens.css', import.meta.url), 'utf8');
const token = (name: string): string => /^#[0-9a-fA-F]{6}$/.exec(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`).exec(tokenCss)?.[1] ?? '')?.[0] ?? `MISSING ${name}`;
const colors: ShareColors = { forest: token('--brand-forest'), lime: token('--brand-lime'), soft: token('--lime-soft'), sage: token('--brand-sage'), amber: token('--amber-bg'), amberInk: token('--amber-fg'), ink: token('--brand-ink') };
const base: ShareInput = { colors, name: 'Αλώνι', dateText: 'Σάβ 21 Νοε', cratesText: '340', cropSlugs: ['spinach', 'rocket', 'chard'], handle: '', demo: false, captions: { crates: 'κλούβες αυτή την εβδομάδα', demo: 'ΕΠΙΔΕΙΞΗ – φανταστικά στοιχεία' } };
const texts = (svg: string): string[] => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]!);

describe('share card colours', () => {
  it('all seven colours exist in tokens.css and the card uses exactly those (the values did not change: forest, lime, sage, ink, soft, amber)', () => {
    expect(Object.values(colors).filter((c) => c.startsWith('MISSING'))).toEqual([]);
    expect(colors).toMatchObject({ forest: '#134a2b', lime: '#c6f062', soft: '#eaf8c4', sage: '#edf2e8', amber: '#ffedc2', amberInk: '#432c00', ink: '#0e1c12' });
    const used = new Set(shareCardSvg({ ...base, demo: true, handle: 'x' }).match(/(?:fill|stroke)="(#[0-9a-f]{6})"/g)?.map((m) => /#[0-9a-f]{6}/.exec(m)![0]));
    expect([...used].filter((c) => !Object.values(colors).includes(c))).toEqual([]);
  });
  it('escape attempt: a different palette changes every colour of the picture (none is baked into card.ts)', () => {
    const other: ShareColors = { forest: '#010101', lime: '#020202', soft: '#030303', sage: '#040404', amber: '#050505', amberInk: '#060606', ink: '#070707' };
    const svg = shareCardSvg({ ...base, colors: other, demo: true, handle: 'x' });
    expect(svg.match(/#[0-9a-fA-F]{6}/g)?.filter((c) => !Object.values(other).includes(c))).toEqual([]);
    for (const c of Object.values(other)) expect(svg).toContain(c);
  });
});

describe('share card', () => {
  it('is a 1080 x 1350 SVG whose text is exactly the allowed lines', () => {
    const svg = shareCardSvg(base);
    expect(svg).toContain('width="1080"'); expect(svg).toContain('height="1350"');
    expect(texts(svg)).toEqual(['Αλώνι', 'Σάβ 21 Νοε', '340', 'κλούβες αυτή την εβδομάδα']);
  });
  it('a record FULL of personal and business data never reaches the picture: extra fields are ignored and no such string appears anywhere in the SVG', () => {
    const pii = { workerName: 'Γιώργος Παπαδόπουλος', parcelName: 'Κάτω Κάμπος', lat: '37.9951', lng: '23.3512', product: 'Kocide 2000', dose: '0,025', client: 'Σκλαβενίτης', price: '1,20 €', note: 'ιδιωτική σημείωση' };
    const svg = shareCardSvg({ ...base, ...pii } as unknown as ShareInput);
    for (const v of Object.values(pii)) expect(svg).not.toContain(v);
    expect(texts(svg)).toEqual(['Αλώνι', 'Σάβ 21 Νοε', '340', 'κλούβες αυτή την εβδομάδα']);
  });
  it('an unknown crate count hides the number AND its caption (never a 0)', () => {
    const svg = shareCardSvg({ ...base, cratesText: undefined });
    expect(texts(svg)).toEqual(['Αλώνι', 'Σάβ 21 Νοε']);
  });
  it('the Demo farm burns the demo line in; the real farm never has it', () => {
    expect(texts(shareCardSvg({ ...base, demo: true }))).toContain('ΕΠΙΔΕΙΞΗ – φανταστικά στοιχεία');
    expect(texts(shareCardSvg(base))).not.toContain('ΕΠΙΔΕΙΞΗ – φανταστικά στοιχεία');
  });
  it('the handle line is optional (empty = none), trimmed and cut to 40 characters; markup in it is escaped', () => {
    expect(texts(shareCardSvg({ ...base, handle: '   ' }))).toHaveLength(4);
    const t = texts(shareCardSvg({ ...base, handle: '  @farm<b>&"x  ' }));
    expect(t.at(-1)).toBe('@farm&lt;b&gt;&amp;&quot;x');
    expect(texts(shareCardSvg({ ...base, handle: 'x'.repeat(80) })).at(-1)).toHaveLength(40);
  });
  it('at most three crop drawings, only known slugs; no network address and no script in the SVG', () => {
    const svg = shareCardSvg({ ...base, cropSlugs: ['spinach', 'rocket', 'chard', 'dill', 'nope'] });
    expect((svg.match(/data-crop="/g) ?? []).length).toBe(3);
    expect(shareCardSvg({ ...base, cropSlugs: ['nope'] })).not.toContain('data-crop');
    expect(svg.replace('xmlns="http://www.w3.org/2000/svg"', '')).not.toMatch(/https?:|<script|<image|href=|xlink|url\(/);   // the one namespace declaration of a standalone SVG is the only address
  });
});

describe('top crops of the week (logged crates only)', () => {
  const crops = [{ id: 'c1', slug: 'spinach' }, { id: 'c2', slug: 'rocket' }, { id: 'c3', slug: 'dill' }] as unknown as Row[];
  const plantings = [{ id: 'p1', crop_id: 'c1' }, { id: 'p2', crop_id: 'c2' }, { id: 'p3', crop_id: 'c3' }] as unknown as Row[];
  const h = (pl: string, at: string, n: string) => ({ id: pl + at, planting_id: pl, harvested_at: at, crates_str: n }) as unknown as Row;
  const now = '2026-11-21T10:00:00Z';
  it('ordered by logged crates, ties by name, only crops with crates, only the last 7 days, unreadable counts ignored', () => {
    const rows = [h('p1', '2026-11-20T08:00:00Z', '4'), h('p2', '2026-11-20T08:00:00Z', '9'), h('p3', '2026-11-20T08:00:00Z', 'abc'), h('p1', '2026-11-01T08:00:00Z', '50')];
    expect(topCropSlugs(rows, plantings, crops, now, 3)).toEqual(['rocket', 'spinach']);
    expect(topCropSlugs([], plantings, crops, now, 3)).toEqual([]);
  });
});
