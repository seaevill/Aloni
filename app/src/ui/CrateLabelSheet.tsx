import { useMemo } from 'preact/hooks';
import { encodeQr, type Qr } from '../auth/qr';
import { formatDate, t } from '../i18n';
import { crateLabel } from '../summary/crate-label';
import { DetailSheet } from './ds';
import { nameOf } from './screens';
import { QrSvg } from './QrSvg';
import { registerSheet, type SheetProps } from './sheets';
import { useRows } from './useRows';
import './crate-label.css';
import { NoteTip } from './NoteTip';

// A harvest record → «Ετικέτα κασέλας»: a sticker to print with the crop, the harvest day, the parcel, the crates, a lot code and a QR code of the same facts as plain text.
// Nothing personal on it (no worker, no phone) and nothing advisory. The code is read by any phone camera as text; the app does not read codes yet.
function CrateLabelSheet({ id, close }: SheetProps) {
  const harvests = useRows('job_harvest'); const plantings = useRows('plantings'); const crops = useRows('crops'); const parcels = useRows('parcels');
  const row = (harvests.rows ?? []).find((h) => h.id === id);
  const planting = (plantings.rows ?? []).find((p) => p.id === row?.planting_id);
  const crop = (crops.rows ?? []).find((c) => c.id === planting?.crop_id);
  const parcel = (parcels.rows ?? []).find((p) => p.id === planting?.parcel_id);
  const label = useMemo(() => (row ? crateLabel(row, String(crop?.slug ?? '')) : undefined), [row, crop]);
  const qr = useMemo((): Qr | undefined => { try { return label ? encodeQr(label.qrText) : undefined; } catch { return undefined; } }, [label]);
  if (!harvests.rows) return null;
  if (!row || !label) return <DetailSheet heading={t('ui.sheet.notfound.head')} onClose={close} testid="sheet-notfound"><p class="ds-muted">{t('ui.sheet.notfound.body')}</p></DetailSheet>;
  return (
    <DetailSheet heading={t('ui.crate.title')} onClose={close} testid="crate-sheet">
      <section class="crate-label" data-testid="crate-label">
        <h2 data-testid="crate-crop">{crop ? nameOf(crop) : t('ui.unknown')}</h2>
        <p data-testid="crate-day">{label.day === '' ? t('ui.unknown') : formatDate(label.day)}</p>
        <p data-testid="crate-parcel">{parcel ? nameOf(parcel) : t('ui.unknown')}</p>
        <p data-testid="crate-crates">{label.crates === undefined ? t('ui.done.crates.unknown') : t('ui.done.crates', { n: label.crates })}</p>
        <p class="crate-lot" data-testid="crate-lot">{t('ui.crate.lot', { lot: label.lot })}</p>
        {qr ? <QrSvg qr={qr} testid="crate-qr" /> : <p class="ds-muted" data-testid="crate-qr-none">{t('ui.invite.qr.none')}</p>}
        <small class="crate-code" data-testid="crate-code">{label.qrText}</small>
      </section>
      <button type="button" class="btn" data-testid="crate-print" onClick={() => window.print()}>{t('ui.crate.print')}</button>
      <NoteTip inline testid="crate-note" text={t('ui.crate.note')} />
    </DetailSheet>
  );
}
registerSheet('crate', CrateLabelSheet);
