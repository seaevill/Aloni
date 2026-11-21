import { describe, expect, it } from 'vitest';
import { encodeQr, formatBits, rsRemainder, type Qr } from '../../src/auth/qr';

// E4: a small QR encoder (byte mode, error correction M, versions 1–6). No library, so it is checked against the standard's own numbers and by an independent reader written here.
// Final acceptance is a real phone camera (Bora's iPhone); the link is always shown next to the code, so a failure never blocks an invitation.
describe('qr building blocks (known values)', () => {
  it('Reed–Solomon: the standard «HELLO WORLD» version 1-M example gives its published 10 check bytes', () => {
    const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
    expect(rsRemainder(data, 10)).toEqual([196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
  });
  it('format bits for level M, mask 0 are the published 101010000010010; other masks differ and stay 15 bits', () => {
    expect(formatBits(0).toString(2).padStart(15, '0')).toBe('101010000010010');
    const all = [0, 1, 2, 3, 4, 5, 6, 7].map(formatBits);
    expect(new Set(all).size).toBe(8);
    for (const b of all) expect(b).toBeLessThan(1 << 15);
  });
});

// An independent reader: format → mask → unmask → walk the zigzag → undo the interleave → check every block's Reed–Solomon → read the bytes.
function read(q: Qr): string {
  const n = q.size; const m = q.modules;
  const bit = (x: number, y: number) => (m[y]![x] ? 1 : 0);
  let fmt = 0; for (let i = 0; i <= 5; i++) fmt |= bit(8, i) << i; fmt |= bit(8, 7) << 6; fmt |= bit(8, 8) << 7; fmt |= bit(7, 8) << 8; for (let i = 9; i < 15; i++) fmt |= bit(14 - i, 8) << i;
  const mask = [0, 1, 2, 3, 4, 5, 6, 7].find((k) => formatBits(k) === fmt);
  if (mask === undefined) throw new Error('format information not readable');
  let fmt2 = 0; for (let i = 0; i < 8; i++) fmt2 |= bit(n - 1 - i, 8) << i; for (let i = 8; i < 15; i++) fmt2 |= bit(8, n - 15 + i) << i;
  expect(fmt2).toBe(fmt);                                                    // both copies of the format information agree
  const version = (n - 17) / 4;
  const centers = version === 1 ? [] : [6, n - 7];
  const fn = (x: number, y: number): boolean => {
    if ((x < 9 && y < 9) || (x >= n - 8 && y < 9) || (x < 9 && y >= n - 8)) return true;
    if (x === 6 || y === 6) return true;
    return centers.length === 2 && Math.abs(x - centers[1]!) <= 2 && Math.abs(y - centers[1]!) <= 2;
  };
  const inv = (x: number, y: number): boolean => [(x + y) % 2 === 0, y % 2 === 0, x % 3 === 0, (x + y) % 3 === 0, (((x - (x % 3)) / 3) + ((y - (y % 2)) / 2)) % 2 === 0, ((x * y) % 2) + ((x * y) % 3) === 0, ((((x * y) % 2) + ((x * y) % 3)) % 2) === 0, ((((x + y) % 2) + ((x * y) % 3)) % 2) === 0][mask]!;
  const bits: number[] = [];
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let v = 0; v < n; v++) for (let j = 0; j < 2; j++) {
      const x = right - j; const up = ((right + 1) & 2) === 0; const y = up ? n - 1 - v : v;
      if (!fn(x, y)) bits.push(bit(x, y) ^ (inv(x, y) ? 1 : 0));
    }
  }
  const cw: number[] = []; for (let i = 0; i + 7 < bits.length; i += 8) cw.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  const TABLE: Record<number, [number, number]> = { 1: [1, 10], 2: [1, 16], 3: [1, 26], 4: [2, 18], 5: [2, 24], 6: [4, 16] };   // [blocks, check bytes per block] for level M
  const [blocks, ecc] = TABLE[version]!;
  const total = [26, 44, 70, 100, 134, 172][version - 1]!; const dataTotal = total - blocks * ecc; const per = dataTotal / blocks;
  const dataBlocks: number[][] = []; const eccBlocks: number[][] = [];
  for (let b = 0; b < blocks; b++) { dataBlocks.push([]); eccBlocks.push([]); }
  let k = 0;
  for (let i = 0; i < per; i++) for (let b = 0; b < blocks; b++) dataBlocks[b]!.push(cw[k++]!);
  for (let i = 0; i < ecc; i++) for (let b = 0; b < blocks; b++) eccBlocks[b]!.push(cw[k++]!);
  for (let b = 0; b < blocks; b++) expect(rsRemainder(dataBlocks[b]!, ecc)).toEqual(eccBlocks[b]);     // every block checks out
  const data = dataBlocks.flat();
  const s = data.map((c) => c.toString(2).padStart(8, '0')).join('');
  expect(s.slice(0, 4)).toBe('0100');                                         // byte mode
  const len = parseInt(s.slice(4, 12), 2);
  const out: number[] = []; for (let i = 0; i < len; i++) out.push(parseInt(s.slice(12 + 8 * i, 20 + 8 * i), 2));
  return new TextDecoder().decode(new Uint8Array(out));
}

describe('encodeQr', () => {
  it('draws the fixed patterns: three finders, timing lines, the dark module', () => {
    const q = encodeQr('https://example.org/?lang=hi');
    const n = q.size; const m = q.modules;
    for (const [ox, oy] of [[0, 0], [n - 7, 0], [0, n - 7]] as const) { expect(m[oy]![ox]).toBe(true); expect(m[oy + 3]![ox + 3]).toBe(true); expect(m[oy + 1]![ox + 1]).toBe(false); expect(m[oy + 6]![ox + 6]).toBe(true); }
    for (let i = 8; i < n - 8; i++) { expect(m[6]![i]).toBe(i % 2 === 0); expect(m[i]![6]).toBe(i % 2 === 0); }
    expect(m[n - 8]![8]).toBe(true);
  });
  it('reads back what was put in, for short and long links (versions 1 to 6), with the check bytes right', () => {
    for (const text of ['hi', 'https://example.org/?lang=hi', 'https://aloni-farm-demo.pages.dev/?lang=hi', 'https://aloni.example.org/join/with/a/rather/longer/path/for/the/test?lang=hi&x=Αλώνι', 'x'.repeat(100)]) {
      expect(read(encodeQr(text))).toBe(text);
    }
  });
  it('grows with the text: 21 modules for the shortest, bigger for longer; refuses what does not fit (the link is shown instead)', () => {
    expect(encodeQr('a').size).toBe(21);
    expect(encodeQr('x'.repeat(30)).size).toBeGreaterThan(21);
    expect(() => encodeQr('x'.repeat(107))).toThrow();
  });
});
