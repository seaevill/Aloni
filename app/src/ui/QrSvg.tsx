import type { Qr } from '../auth/qr';
import { t } from '../i18n';

/** A QR code as one SVG path (crisp edges, a 4-module quiet zone). Pure drawing: the text is already encoded. */
export function QrSvg({ qr, testid }: { qr: Qr; testid: string }) {
  const q = 4;
  const path = qr.modules.flatMap((row, y) => {
    const runs: string[] = [];
    for (let x = 0; x < row.length; x++) { if (!row[x]) continue; let e = x; while (e < row.length && row[e]) e++; runs.push(`M${x + q} ${y + q}h${e - x}v1h-${e - x}z`); x = e; }
    return runs;
  }).join('');
  return (
    <svg class="crate-qr" viewBox={`0 0 ${qr.size + 2 * q} ${qr.size + 2 * q}`} role="img" aria-label={t('ui.crate.qr.alt')} data-testid={testid} shape-rendering="crispEdges">
      <rect width="100%" height="100%" class="invite-qr-bg" /><path d={path} class="invite-qr-ink" />
    </svg>
  );
}
