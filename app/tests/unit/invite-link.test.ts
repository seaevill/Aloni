import { describe, expect, it } from 'vitest';
import { inviteLink, langFromSearch } from '../../src/auth/invite-link';

// E4: the worker invitation link opens the app in HER language (Hindi by default for a worker invited from the roster) and sends no personal data: only the language. The app address is the one the owner is using.
describe('inviteLink', () => {
  it('is the app address plus the language, nothing else (no e-mail, no name, no farm id)', () => {
    expect(inviteLink('https://app.example.org', 'hi')).toBe('https://app.example.org/?lang=hi');
    expect(inviteLink('https://app.example.org/', 'el')).toBe('https://app.example.org/?lang=el');
  });
});

describe('langFromSearch', () => {
  it('reads a supported language from the address; anything else is ignored', () => {
    expect(langFromSearch('?lang=hi')).toBe('hi');
    expect(langFromSearch('?x=1&lang=tr')).toBe('tr');
    expect(langFromSearch('?lang=fr')).toBeUndefined();
    expect(langFromSearch('')).toBeUndefined();
    expect(langFromSearch('?lang=')).toBeUndefined();
  });
});
