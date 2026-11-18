import { DEMO_FARM_ID } from '../config';
import { activeFarm } from '../db';
import { t } from '../i18n';

/** Shown on every screen while the Demo farm is active: nothing here is real. */
export function DemoBanner() {
  return activeFarm.value === DEMO_FARM_ID ? <p class="badge unsigned demo-banner" role="note" data-testid="demo-banner">{t('demo.banner')}</p> : null;
}
