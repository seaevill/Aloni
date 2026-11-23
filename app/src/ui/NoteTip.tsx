import { t } from '../i18n';
import { Icon } from './icons/Icon';
import './note-tip.css';

/** A quiet «ⓘ»: the explanatory sentence (where it is kept, what the app does not do) is one tap away instead of printed on every card. In a card it sits in the top-right corner; `inline` puts it in the flow. */
export function NoteTip({ text, testid, inline = false }: { text: string; testid: string; inline?: boolean }) {
  return (
    <details class={inline ? 'note-tip inline' : 'note-tip'} data-testid={testid}>
      <summary aria-label={t('ui.note.aria')}><Icon name="info" size="var(--icon-sm)" /></summary>
      <p>{text}</p>
    </details>
  );
}
