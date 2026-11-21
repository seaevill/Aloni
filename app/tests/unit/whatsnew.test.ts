import { describe, expect, it } from 'vitest';
import { dictionaries, ensureAllLangs } from '../../src/i18n';
import { RELEASES } from '../../src/ui/whatsnew';

await ensureAllLangs();
// «Τι νέο»: every release tells Bora exactly THREE things in Greek (and the same three in Turkish and English), newest first; nothing is promised that is not built.
describe('release notes', () => {
  it('every release has exactly 3 items, each written in el, tr and en', () => {
    expect(RELEASES.length).toBeGreaterThan(0);
    for (const r of RELEASES) {
      expect(r.items, r.id).toHaveLength(3);
      for (const key of r.items) for (const l of ['el', 'tr', 'en'] as const) expect(dictionaries[l][key], `${l} ${key}`).toBeTruthy();
    }
  });
  it('release ids are unique and dated; newest first', () => {
    const ids = RELEASES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of RELEASES) expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const dates = RELEASES.map((r) => r.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });
});
