import { t } from '../../i18n';
import { closeSheet, sheet } from '../nav';
import { sheetComponent } from '../sheets';
import { DetailSheet } from './DetailSheet';

/** Renders the sheet named in the address (mounted once in the owner's App and in the worker's screen). A kind nobody registered, or an id that no longer exists, says so with a reason: never a blank sheet. */
export function SheetHost() {
  const s = sheet.value;
  if (!s) return null;
  const Component = sheetComponent(s.kind);
  if (Component) return <Component id={s.id} close={closeSheet} />;
  return (
    <DetailSheet heading={t('ui.sheet.notfound.head')} onClose={closeSheet} testid="sheet-notfound">
      <p class="ds-muted">{t('ui.sheet.notfound.body')}</p>
    </DetailSheet>
  );
}
