import { rejectedOps } from '../repo';
import { t, type I18nKey } from '../i18n';
import { explainRejection } from '../sync/rejection';
import { DetailSheet } from './ds/DetailSheet';
import { Icon } from './icons/Icon';
import { registerSheet, type SheetProps } from './sheets';

// E3: tapping «δεν έγινε δεκτό» on a record opens THIS: what the record was, why the server refused it, what to do, and that it is still on the phone, in the same plain words as the refused-records list (B6).
// If the server's answer is no longer here, the sheet says so instead of staying empty.
function RefusedSheet({ id, close }: SheetProps) {
  const ops = rejectedOps.value.filter((o) => o.row_id === id);
  return (
    <DetailSheet heading={t('ui.refused.title')} icon={<Icon name="info" />} onClose={close} testid="sheet-refused">
      {ops.length === 0 && <p class="ds-muted" data-testid="sheet-why">{t('ui.refused.none')}</p>}
      {ops.map((o) => {
        const e = explainRejection(o.table, o.reason, o.code);
        return (
          <section key={o.op_id} data-testid="refused-op">
            <h3>{e.what === undefined ? o.table : t(e.what as I18nKey)}</h3>
            <p data-testid="refused-why">{t(e.why as I18nKey)}</p>
            <p data-testid="refused-fix">{t(e.fix as I18nKey)}</p>
            <p class="ds-muted">{t('rejected.kept')}</p>
            {e.raw !== '' && <p class="ds-muted" data-testid="refused-raw">{t('rejected.raw', { reason: e.raw })}</p>}
          </section>
        );
      })}
    </DetailSheet>
  );
}
registerSheet('refused', RefusedSheet);
