import { SYNC_CONNECTED } from '../config';
import { db } from '../db';
import { rejectedOps } from '../repo';
import { dismissRejected } from '../repo/sync-apply';
import { t, type I18nKey } from '../i18n';
import { explainRejection } from '../sync/rejection';

/** The records the server REFUSED (only with a live sync), each explained in plain words: what it was, why it was refused, what to do. Nothing is lost: the record stays on the phone. «Το είδα» only removes the line (the record is not deleted). */
export function RejectedList() {
  const rows = rejectedOps.value;
  if (!SYNC_CONNECTED || rows.length === 0) return null;
  return (
    <section class="card blocked" role="alert" data-testid="sync-rejected">
      <strong>{t('sync.rejected.title')}</strong>
      {rows.map((o) => {
        const e = explainRejection(o.table, o.reason, o.code);
        const what = e.what === undefined ? o.table : t(e.what as I18nKey);
        return (
          <div class="line" key={o.op_id} data-testid="sync-rejected-line">
            <strong>{what}</strong>
            <small data-testid="rejected-why">{t(e.why as I18nKey)}</small>
            <small data-testid="rejected-fix">{t(e.fix as I18nKey)}</small>
            <small class="muted">{t('rejected.kept')}</small>
            {e.raw !== '' && <small class="muted" data-testid="rejected-raw">{t('rejected.raw', { reason: e.raw })}</small>}
            <button class="btn secondary" onClick={() => void dismissRejected(db, o.op_id)}>{t('sync.rejected.dismiss')}</button>
          </div>
        );
      })}
    </section>
  );
}
