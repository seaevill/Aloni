/** SVG text → a 1080 x 1350 PNG, entirely on this phone (no network call). `undefined` = the browser could not draw it; the caller says so. */
export async function svgToPng(svg: string): Promise<Blob | undefined> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 1080; canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.drawImage(img, 0, 0, 1080, 1350);
    return await new Promise<Blob | undefined>((done) => canvas.toBlob((b) => done(b ?? undefined), 'image/png'));
  } catch { return undefined; } finally { URL.revokeObjectURL(url); }
}

/** Share sheet first (with the picture as a file), else a download. 'cancelled' = the owner closed the sheet: nothing to report. */
export async function sharePng(png: Blob, filename: string, nav: { canShare?: (d: { files: File[] }) => boolean; share?: (d: { files: File[] }) => Promise<void> }): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([png], filename, { type: 'image/png' });
  try {
    if (nav.share && nav.canShare?.({ files: [file] })) { await nav.share({ files: [file] }); return 'shared'; }
  } catch (e) { if (e instanceof Error && e.name === 'AbortError') return 'cancelled'; /* refused: download instead */ }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(png); a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  return 'downloaded';
}
