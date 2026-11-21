// A small QR code encoder for the worker invitation link (E4): byte mode, error correction level M, versions 1–6 (up to 106 bytes). No library.
// The text is the only input; nothing is sent anywhere. A text that does not fit throws: the screen then shows the link without a code.
export interface Qr { size: number; modules: boolean[][] }

// ---- Reed–Solomon over GF(256), polynomial 0x11D ----
const EXP: number[] = []; const LOG: number[] = [];
{ let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]!; }
const mul = (a: number, b: number): number => (a === 0 || b === 0 ? 0 : EXP[LOG[a]! + LOG[b]!]!);

/** The `degree` check bytes of a block of data bytes. */
export function rsRemainder(data: readonly number[], degree: number): number[] {
  let gen = [1];
  for (let i = 0; i < degree; i++) { const next = new Array<number>(gen.length + 1).fill(0); gen.forEach((c, j) => { next[j] ^= c; next[j + 1]! ^= mul(c, EXP[i]!); }); gen = next; }
  const rem = new Array<number>(degree).fill(0);
  for (const b of data) {
    const f = b ^ rem.shift()!; rem.push(0);
    for (let i = 0; i < degree; i++) rem[i]! ^= mul(gen[i + 1]!, f);
  }
  return rem;
}

/** The 15 format bits for level M and a mask: 5 data bits + 10 BCH check bits, XOR 0x5412. */
export function formatBits(mask: number): number {
  const data = (0 << 3) | mask;                       // level M = 00
  let rem = data; for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

// version → [blocks, check bytes per block, data bytes per block, alignment centre] for level M (all blocks of one version have the same size up to version 6)
const VERSIONS: ReadonlyArray<readonly [number, number, number, number | undefined]> = [[1, 10, 16, undefined], [1, 16, 28, 18], [1, 26, 44, 22], [2, 18, 32, 26], [2, 24, 43, 30], [4, 16, 27, 34]];

export function encodeQr(text: string): Qr {
  const bytes = [...new TextEncoder().encode(text)];
  const v = VERSIONS.findIndex(([blocks, , per]) => blocks * per >= bytes.length + 2);   // 4 mode bits + 8 length bits = 1.5 bytes, rounded up with the terminator
  if (v < 0) throw new Error('text too long for the code');
  const [blocks, ecc, per, centre] = VERSIONS[v]!;
  const size = 17 + 4 * (v + 1);

  // data bits: mode 0100, length, bytes, terminator, padding
  const bits: number[] = []; const push = (val: number, n: number) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  push(0b0100, 4); push(bytes.length, 8); bytes.forEach((b) => push(b, 8));
  const capacity = blocks * per * 8;
  push(0, Math.min(4, capacity - bits.length)); while (bits.length % 8 !== 0) bits.push(0);
  const data: number[] = []; for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  for (let pad = 0xec; data.length < blocks * per; pad = pad === 0xec ? 0x11 : 0xec) data.push(pad);

  // check bytes per block, then interleave
  const dataBlocks = Array.from({ length: blocks }, (_, b) => data.slice(b * per, (b + 1) * per));
  const eccBlocks = dataBlocks.map((d) => rsRemainder(d, ecc));
  const all: number[] = [];
  for (let i = 0; i < per; i++) for (const d of dataBlocks) all.push(d[i]!);
  for (let i = 0; i < ecc; i++) for (const e of eccBlocks) all.push(e[i]!);

  // function patterns
  const mods: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const isFn: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const set = (x: number, y: number, dark: boolean) => { mods[y]![x] = dark; isFn[y]![x] = true; };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const finder = (cx: number, cy: number) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)); const x = cx + dx; const y = cy + dy; if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4); } };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  if (centre !== undefined) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(centre + dx, centre + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  const drawFormat = (m: Qr['modules'], mask: number) => {
    const b = formatBits(mask); const g = (i: number) => ((b >>> i) & 1) === 1;
    const s = (x: number, y: number, d: boolean) => { m[y]![x] = d; isFn[y]![x] = true; };
    for (let i = 0; i <= 5; i++) s(8, i, g(i)); s(8, 7, g(6)); s(8, 8, g(7)); s(7, 8, g(8)); for (let i = 9; i < 15; i++) s(14 - i, 8, g(i));
    for (let i = 0; i < 8; i++) s(size - 1 - i, 8, g(i)); for (let i = 8; i < 15; i++) s(8, size - 15 + i, g(i));
    s(8, size - 8, true);                                  // the always-dark module
  };
  drawFormat(mods, 0);                                     // reserves the format areas (the real bits are drawn after the mask is chosen)

  // data in the zigzag
  let k = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j; const up = ((right + 1) & 2) === 0; const y = up ? size - 1 - vert : vert;
      if (!isFn[y]![x] && k < all.length * 8) { mods[y]![x] = ((all[k >>> 3]! >>> (7 - (k & 7))) & 1) === 1; k++; }
    }
  }

  // the mask with the lowest penalty
  const inv = (mask: number, x: number, y: number): boolean => [(x + y) % 2 === 0, y % 2 === 0, x % 3 === 0, (x + y) % 3 === 0, (((x - (x % 3)) / 3) + ((y - (y % 2)) / 2)) % 2 === 0, ((x * y) % 2) + ((x * y) % 3) === 0, ((((x * y) % 2) + ((x * y) % 3)) % 2) === 0, ((((x + y) % 2) + ((x * y) % 3)) % 2) === 0][mask]!;
  const apply = (mask: number): boolean[][] => { const m = mods.map((r) => r.slice()); for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!isFn[y]![x] && inv(mask, x, y)) m[y]![x] = !m[y]![x]; drawFormat(m, mask); return m; };
  let best = apply(0); let bestScore = penalty(best);
  for (let mask = 1; mask < 8; mask++) { const m = apply(mask); const s = penalty(m); if (s < bestScore) { best = m; bestScore = s; } }
  return { size, modules: best };
}

/** How hard a pattern is to scan (lower is better): long runs, 2×2 blocks, finder-like patterns, dark/light balance. Only picks the mask: any mask is a valid code. */
function penalty(m: boolean[][]): number {
  const n = m.length; let p = 0;
  for (let pass = 0; pass < 2; pass++) {
    for (let a = 0; a < n; a++) {
      let run = 1; let hist = '';
      for (let b = 0; b < n; b++) {
        const cur = pass === 0 ? m[a]![b]! : m[b]![a]!; const prev = b > 0 ? (pass === 0 ? m[a]![b - 1]! : m[b - 1]![a]!) : cur;
        if (b > 0) { if (cur === prev) { run++; if (run === 5) p += 3; else if (run > 5) p += 1; } else run = 1; }
        hist += cur ? '1' : '0';
      }
      for (const pat of ['10111010000', '00001011101']) { let i = hist.indexOf(pat); while (i >= 0) { p += 40; i = hist.indexOf(pat, i + 1); } }
    }
  }
  for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) if (m[y]![x] === m[y]![x + 1] && m[y]![x] === m[y + 1]![x] && m[y]![x] === m[y + 1]![x + 1]) p += 3;
  let dark = 0; for (const r of m) for (const c of r) if (c) dark++;
  const total = n * n; const off = Math.abs(dark * 20 - total * 10); const rest = off % total;
  p += (((off - rest) / total) + (rest > 0 ? 1 : 0) - 1) * 10;      // ceil(off / total) - 1, with whole-number arithmetic
  return p;
}
