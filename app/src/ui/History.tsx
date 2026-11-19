import { t } from '../i18n';
import { Harvests } from './HarvestForm';
import { Sprays } from './Sprays';

/** The records of the past, on their own screen (Σήμερα keeps only what matters today). A fixed top bar with a back chevron. */
export function History({ readOnly, onBack }: { readOnly: boolean; onBack: () => void }) {
  return (
    <section class="history" data-testid="history">
      <div class="topbar"><button class="back" data-testid="history-back" aria-label={t('info.back')} onClick={onBack}><span aria-hidden="true" class="chev back-chev" /> <span>{t('info.back')}</span></button><h1>{t('history.title')}</h1></div>
      <Sprays readOnly={readOnly} />
      <Harvests />
    </section>
  );
}
