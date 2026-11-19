import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../src/crops/catalog';
import { EPPO_CODES, eppoUrl } from '../../src/export/eppo';

// The list is LOCKED: changing a code needs this test to change too, i.e. a person who looked at gd.eppo.int.
const LOCKED: Record<string, string> = {
  spinach: 'SPQOL', endive: 'CICEN', coriander: 'CORSA', onion: 'ALLCE', leek: 'ALLPO', cabbage: 'BRSOL', dill: 'AFEGR', parsley: 'PARCR', rocket: 'ERUVE', radish: 'RAPSR',
  chicory: 'CICIN', chard: 'BEAVV', beet: 'BEAVD', kaukalithra: 'TORAP',
};
describe('EPPO codes (checked on gd.eppo.int by the team)', () => {
  it('are exactly the locked list; celery, myroni and vlita stay empty', () => {
    expect(EPPO_CODES).toEqual(LOCKED);
    for (const slug of ['celery', 'myroni', 'vlita']) expect(EPPO_CODES[slug]).toBeUndefined();
  });
  it('every code belongs to a catalog crop, is five capital letters, and has its source page', () => {
    for (const [slug, code] of Object.entries(EPPO_CODES)) {
      expect(CATALOG.some((c) => c.slug === slug)).toBe(true);
      expect(code).toMatch(/^[A-Z]{5}$/);
      expect(eppoUrl(code)).toBe(`https://gd.eppo.int/taxon/${code}`);
    }
  });
  it('the old, wrong codes are gone', () => { const all = Object.values(EPPO_CODES); for (const bad of ['ANGGR', 'PYWCR', 'ERUSA', 'RAPSN', 'APUGR']) expect(all).not.toContain(bad); });
});
