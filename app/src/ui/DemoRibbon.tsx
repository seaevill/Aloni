import { DEMO_FARM_ID } from '../config';
import { activeFarm } from '../db';
import { t } from '../i18n';
import { Icon } from './icons/Icon';

/** The ONE demo mark (design sprint §1.12): a full-width amber strip, sticky, on every screen while the Demo farm is active; never dismissable; none on the real farm. It replaces the old pill, header badge and intro sentence. */
export function DemoRibbon() {
  return activeFarm.value === DEMO_FARM_ID
    ? <p class="demo-ribbon" role="note" data-testid="demo-banner"><Icon name="info" size="var(--icon-sm)" /><span>{t('demo.banner')}</span></p>
    : null;
}
