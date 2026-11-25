import { t, type I18nKey } from '../i18n';

// The title of a job in a list: a spraying is named by its product; every other kind of job (the server knows fertilise, irrigate, sow, harvest, other) is named by its kind, so no job is shown as «άγνωστο».
const KIND: Record<string, I18nKey> = { fertilise: 'ui.job.kind.fertilise', irrigate: 'ui.job.kind.irrigate', sow: 'ui.job.kind.sow', harvest: 'ui.job.kind.harvest', other: 'ui.job.kind.other' };
export const kindTitle = (job: { kind?: unknown }): string | undefined => (typeof job.kind === 'string' && job.kind !== 'spray' ? t(KIND[job.kind] ?? 'ui.job.kind.other') : undefined);
