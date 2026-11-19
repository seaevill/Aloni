import { t } from '../i18n';

/** The fixed bar at the top of a screen that was opened from a list: a back chevron (‹) and one word. Replaces the full-width «Επιστροφή» button at the bottom. */
export function BackBar({ onBack, testId }: { onBack: () => void; testId?: string }) {
  return (
    <div class="topbar">
      <button class="back" data-testid={testId} onClick={onBack}><span aria-hidden="true" class="chev back-chev" /><span>{t('info.back')}</span></button>
    </div>
  );
}
