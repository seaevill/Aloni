import { t } from '../i18n';
import { BackBar } from './BackBar';
import { Harvests } from './HarvestForm';
import { Sprays } from './Sprays';

/** The records of the past, on their own screen (Σήμερα keeps only what matters today). A fixed top bar with a back chevron. */
export function History({ readOnly, onBack }: { readOnly: boolean; onBack: () => void }) {
  return (
    <section class="history" data-testid="history">
      <BackBar onBack={onBack} testId="history-back" />
      <h1>{t('history.title')}</h1>
      <Sprays readOnly={readOnly} />
      <Harvests />
    </section>
  );
}
