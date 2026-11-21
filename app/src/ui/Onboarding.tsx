import { useEffect, useState } from 'preact/hooks';
import { t, type I18nKey } from '../i18n';
import { db } from '../db';
import { Mark } from './brand/Brand';

// Owner first-run onboarding (design sprint D9): three short, skippable cards, then the normal screen with its own «add a field» / «demo» choice. Only a LOCAL seen-flag is stored (this phone's localStorage; never synced, no analytics).
// Never shown to a worker: the worker route does not render it (App.tsx), and a farm that already has a field counts as «seen».
export const ONBOARDING_KEY = 'onboarding_seen';
const CARDS: Array<{ head: I18nKey; body: I18nKey }> = [
  { head: 'ui.onb.1.head', body: 'ui.onb.1.body' },
  { head: 'ui.onb.2.head', body: 'ui.onb.2.body' },
  { head: 'ui.onb.3.head', body: 'ui.onb.3.body' },
];
const seen = (): boolean => { try { return localStorage.getItem(ONBOARDING_KEY) === '1'; } catch { return true; } };   // storage unavailable: never nag
const markSeen = (): void => { try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch { /* ignore */ } };

export function Onboarding({ done }: { done: () => void }) {
  const [step, setStep] = useState(0);
  const last = step === CARDS.length - 1;
  const card = CARDS[step]!;
  const finish = () => { markSeen(); done(); };
  const nextText = last ? t('ui.onb.start') : t('ui.onb.next');
  return (
    <section class="ds-onboarding" data-testid="onboarding" data-step={step + 1}>
      <Mark size="var(--empty-art)" />
      <h1 class="ds-onboarding-head">{t(card.head)}</h1>
      <p class="ds-onboarding-body">{t(card.body)}</p>
      <button class="btn" data-testid="onboarding-next" onClick={() => (last ? finish() : setStep(step + 1))}>{nextText}</button>
      {!last && <button class="btn secondary" data-testid="onboarding-skip" onClick={finish}>{t('ui.onb.skip')}</button>}
    </section>
  );
}

/** True while the onboarding should be shown: not seen on this phone AND this phone holds no field yet (an existing farm never sees it). */
export function useOnboarding(): [boolean, () => void] {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (seen()) return;
    void db.parcels.count().then((n) => { if (n > 0) markSeen(); else setShow(true); }, () => undefined);
  }, []);
  return [show, () => setShow(false)];
}
