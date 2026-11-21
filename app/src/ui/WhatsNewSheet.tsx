import { formatDate, t } from '../i18n';
import { DetailSheet } from './ds/DetailSheet';
import { Icon } from './icons/Icon';
import { registerSheet, type SheetProps } from './sheets';
import { RELEASES } from './whatsnew';

// «Τι νέο» (address /sheet/whatsnew/all): the release notes, newest first, three plain lines each. Opened from the version line in Άλλα (the link is asked of Codex in docs/handoff/codex-notes.md).
function WhatsNewSheet({ close }: SheetProps) {
  return (
    <DetailSheet heading={t('ui.news.title')} icon={<Icon name="info" />} onClose={close} testid="sheet-whatsnew">
      {RELEASES.map((r) => (
        <section key={r.id} data-testid="release">
          <h3>{formatDate(r.date)}</h3>
          <ul class="ds-steps">{r.items.map((k) => <li key={k}>{t(k)}</li>)}</ul>
        </section>
      ))}
    </DetailSheet>
  );
}
registerSheet('whatsnew', WhatsNewSheet);
