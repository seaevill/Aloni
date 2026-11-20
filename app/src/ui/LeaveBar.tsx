import { t } from '../i18n';
import { leaveAsk } from './backstack';

/** «Να φύγω χωρίς αποθήκευση;» — asked when Back would close a form with something typed in it. */
export function LeaveBar() {
  const a = leaveAsk.value;
  if (!a) return null;
  return (
    <div class="card" role="alertdialog" aria-label={t('nav.leave')} data-testid="leave-ask">
      <strong>{t('nav.leave')}</strong>
      <div class="seg two"><button data-testid="leave-stay" onClick={a.stay}>{t('nav.leave.stay')}</button><button data-testid="leave-go" onClick={a.go}>{t('nav.leave.go')}</button></div>
    </div>
  );
}
