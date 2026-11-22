import { useEffect, useState } from 'preact/hooks';
import { t } from '../../i18n';
import { closeSheet, sheet } from '../nav';
import { sheetComponent, sheetLoader } from '../sheets';
import { DetailSheet } from './DetailSheet';

/** Renders the sheet named in the address (mounted once in the owner's App and in the worker's screen). A kind nobody registered, or an id that no longer exists, says so with a reason: never a blank sheet. */
export function SheetHost() {
  const s = sheet.value;
  const [, again] = useState(0);
  const [failed, setFailed] = useState(false);
  const kind = s?.kind;
  const loader = kind === undefined || sheetComponent(kind) !== undefined ? undefined : sheetLoader(kind);
  useEffect(() => {
    if (!loader) return;
    setFailed(false);
    loader().then(() => again((n) => n + 1)).catch(() => setFailed(true));
  }, [kind]);
  if (!s) return null;
  const Component = sheetComponent(s.kind);
  if (Component) return <Component id={s.id} close={closeSheet} />;
  if (loader && !failed) return null;
  return (
    <DetailSheet heading={t('ui.sheet.notfound.head')} onClose={closeSheet} testid="sheet-notfound">
      <p class="ds-muted">{t('ui.sheet.notfound.body')}</p>
    </DetailSheet>
  );
}
