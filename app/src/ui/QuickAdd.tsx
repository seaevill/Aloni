import { useState } from 'preact/hooks';
import { t } from '../i18n';
import { DetailSheet } from './ds/DetailSheet';
import { ListRow, IconTile } from './ds/Surfaces';
import { Icon } from './icons/Icon';

/** One round «＋» on Σήμερα in the thumb zone (bottom right, above the tab bar, 56 px): one press opens a short list of the four things the owner adds most; each row is a 56 px target. */
export function QuickAdd({ onSpray, onHarvest, onObserve, onJob }: { onSpray: () => void; onHarvest: () => void; onObserve: () => void; onJob: () => void }) {
  const [open, setOpen] = useState(false);
  const go = (f: () => void) => () => { setOpen(false); f(); };
  return (
    <>
      <button type="button" class="quick-fab" data-testid="quick-open" aria-label={t('ui.quick.open')} onClick={() => setOpen(true)}><Icon name="plus" /></button>
      {open && (
        <DetailSheet heading={t('ui.quick.title')} onClose={() => setOpen(false)} testid="quick-menu" history={false}>
          <ListRow testid="quick-spray" icon={<IconTile name="sprayer" />} heading={t('ui.quick.spray')} onClick={go(onSpray)} />
          <ListRow testid="quick-harvest" icon={<IconTile name="crate" />} heading={t('ui.quick.harvest')} onClick={go(onHarvest)} />
          <ListRow testid="quick-observe" icon={<IconTile name="camera" />} heading={t('ui.quick.observe')} onClick={go(onObserve)} />
          <ListRow testid="quick-job" icon={<IconTile name="calendar" />} heading={t('ui.quick.job')} onClick={go(onJob)} />
        </DetailSheet>
      )}
    </>
  );
}
