import { dataVersion, loadDemo } from '../db';
import { lang, t, type I18nKey } from '../i18n';
import { CATALOG, cropName } from '../crops/catalog';
import { EmptyState, ErrorState } from './states';
import type { Rows } from './useRows';

export { Parcels } from './Parcels';
export { Today } from './Today';

export function Title({ k }: { k: I18nKey }) {
  return (
    <h1>
      {t(k)}
    </h1>
  );
}

/** A record's name in the current language. Nothing found = an EMPTY text, never the word «undefined» (the lists load one after the other). */
export const nameOf = (r: Record<string, unknown>): string => {
  if (lang.value === 'hi' && typeof r.slug === 'string') { const c = CATALOG.find((x) => x.slug === r.slug); if (c) return cropName(c, 'hi'); } // «पालक · Σπανάκι»
  const found = r[`name_${lang.value === 'hi' ? 'el' : lang.value}`] ?? r.name_en ?? r.name ?? r.label ?? r.id;
  return typeof found === 'string' || typeof found === 'number' ? String(found) : '';
};

export const retry = () => { dataVersion.value++; };

/** The two states every list has: an error that says what to do next, and an empty state with ONE action. */
export function Status({ q, message, action }: { q: Rows; message: string; action?: { label: string; run: () => void } }) {
  return (
    <>
      {q.failed && <ErrorState onRetry={retry} />}
      {q.rows && !q.rows.length && <EmptyState message={message} actionLabel={action?.label ?? t('more.loadDemo')} onAction={action?.run ?? (() => void loadDemo())} />}
    </>
  );
}
