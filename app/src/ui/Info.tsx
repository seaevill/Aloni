import { t } from '../i18n';

/** Settings → Information: draft legal texts (privacy notice for workers, decision-support disclaimer). Static, works offline. */
export function Info({ onBack }: { onBack: () => void }) {
  return (
    <section>
      <h1>{t('info.title')}</h1>
      <p class="draft" role="note">{t('info.draft')}</p>

      <h2>{t('info.privacy.title')}</h2>
      <p class="card" data-testid="info-privacy">{t('info.privacy.body')}</p>

      <h2>{t('info.disclaimer.title')}</h2>
      <p class="card" data-testid="info-disclaimer">{t('info.disclaimer.body')}</p>

      <button class="btn secondary" onClick={onBack}>{t('info.back')}</button>
    </section>
  );
}
