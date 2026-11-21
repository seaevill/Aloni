// E4: the link a worker opens on her own phone. It carries ONLY the language (no e-mail, name or farm id); she signs in with her e-mail and the 6-digit code.
export type InviteLang = 'el' | 'tr' | 'en' | 'hi';
const LANGS: readonly string[] = ['el', 'tr', 'en', 'hi'];

export const inviteLink = (origin: string, lang: InviteLang): string => `${origin.replace(/\/+$/, '')}/?lang=${lang}`;

/** The language written in an address (`?lang=hi`), when it is one the app has; otherwise nothing. */
export function langFromSearch(search: string): InviteLang | undefined {
  const v = new URLSearchParams(search).get('lang');
  return v !== null && LANGS.includes(v) ? (v as InviteLang) : undefined;
}
