import { parseWhole } from '@aloni/rules-core';
import type { Row } from '../db/schema';

// The label of a harvest crate (a sticker the owner prints): the crop, the harvest day, the lot code and the crates, with a QR code of the same facts as plain ASCII text.
// Nothing personal (no worker, no phone) and nothing advisory goes on it. The lot code is the first 8 characters of the harvest record's id, so it is the same on every print.
export interface CrateLabel { lot: string; day: string; crates?: string; qrText: string }
const dayOf = (iso: string): string => { const ms = Date.parse(iso); return Number.isFinite(ms) ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms) : ''; };

export function crateLabel(harvest: Row, cropSlug: string): CrateLabel {
  const id = typeof harvest.id === 'string' ? harvest.id : '';
  const lot = (/^[0-9a-f]{1,8}/i.exec(id.replace(/-/g, ''))?.[0] ?? '').toUpperCase();
  const day = dayOf(typeof harvest.harvested_at === 'string' ? harvest.harvested_at : '');
  const n = parseWhole<'Crates'>(typeof harvest.crates_str === 'string' ? harvest.crates_str : '');
  const parts = ['ALONI', 'LOT', lot, /^[a-z0-9]+$/.test(cropSlug) ? cropSlug : '', day, n.known ? String(n.value) : ''].filter((x) => x !== '');
  const out: CrateLabel = { lot, day, qrText: parts.join('/') };
  if (n.known) out.crates = String(n.value);
  return out;
}
