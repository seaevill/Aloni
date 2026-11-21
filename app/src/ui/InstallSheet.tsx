import { t } from '../i18n';
import { DetailSheet } from './ds/DetailSheet';
import { Icon, type IconName } from './icons/Icon';
import { registerSheet, type SheetProps } from './sheets';

// «Προσθήκη στην αρχική οθόνη» (iPhone): five steps, each with its picture, and the warning that Safari and the Home Screen app keep SEPARATE data. Shown from Σήμερα only on iPhone Safari that is not yet installed.
const STEPS: ReadonlyArray<{ icon: IconName; text: 'ui.install.step1' | 'ui.install.step2' | 'ui.install.step3' | 'ui.install.step4' | 'ui.install.step5' }> = [
  { icon: 'info', text: 'ui.install.step1' }, { icon: 'share', text: 'ui.install.step2' }, { icon: 'plus', text: 'ui.install.step3' }, { icon: 'check', text: 'ui.install.step4' }, { icon: 'today', text: 'ui.install.step5' },
];

function InstallSheet({ close }: SheetProps) {
  return (
    <DetailSheet heading={t('ui.install.title')} icon={<Icon name="share" />} onClose={close} testid="sheet-install">
      <ol class="ds-steps install-steps">
        {STEPS.map((s) => <li key={s.text}><span class="install-pic"><Icon name={s.icon} /></span><span>{t(s.text)}</span></li>)}
      </ol>
      <p class="card blocked" role="note" data-testid="install-warning">{t('ui.install.warning')}</p>
    </DetailSheet>
  );
}
registerSheet('install', InstallSheet);
