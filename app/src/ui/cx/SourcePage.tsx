import type { ComponentChildren } from 'preact';
import { t } from '../../i18n';
import { PageHead } from '../ds';

// TODO(ds): DetailSheet
export function SourcePage({ heading, onBack, children }: {
  heading: string;
  onBack: () => void;
  children: ComponentChildren;
}) {
  return <section data-testid="source-page">
    <PageHead heading={heading} back={onBack} backText={t('info.back')} />
    {children}
  </section>;
}
