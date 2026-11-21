import type { I18nKey } from '../i18n';

// «Τι νέο»: what changed in each release, in three plain lines (Greek first; Turkish and English too). Add the newest release at the TOP. Say only what is built and can be tried on the phone.
export interface Release { id: string; date: string; items: readonly [I18nKey, I18nKey, I18nKey] }
export const RELEASES: readonly Release[] = [
  { id: '2026-11-21', date: '2026-11-21', items: ['ui.news.r1.a', 'ui.news.r1.b', 'ui.news.r1.c'] },
];
