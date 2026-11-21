import { describe, expect, it } from 'vitest';
import { cratesByCrop, parseBackup, suggestCropMap } from '../../src/orders/klouves';
import fixture from '../fixtures/orders/klouves-edge-cases.json';

function importFixture() {
  const parsed = parseBackup(JSON.stringify(fixture));
  if (!parsed.ok) throw new Error('The Κλούβες fixture must be accepted');
  return parsed.orders;
}

describe('Κλούβες backup edge cases', () => {
  it('leaves an empty day empty and retains exact fractional crates', () => {
    const { days, weeks, skipped } = importFixture();
    expect(days).toEqual({ '2026-11-21': { 'client-a': { known: 0.5, 'unknown-slug': 1.25 } } });
    expect(weeks).toEqual({ '2026-11-16': { known: 0.5, 'unknown-slug': 1.25 } });
    expect(skipped).toBe(0);
  });

  it('matches Greek crop names across accents and reports an unknown product as unmapped', () => {
    const { products, weeks } = importFixture();
    const map = suggestCropMap(products);
    expect(map).toEqual({ known: 'spinach' });
    expect(cratesByCrop(weeks['2026-11-16'], map)).toEqual({
      bySlug: { spinach: 0.5 }, unmapped: ['unknown-slug'],
    });
  });

  it('preserves Greek client spelling and does not multiply the order for a repeated client entry', () => {
    const { clients, weeks } = importFixture();
    expect(clients?.map(({ name }) => name)).toContain('Μανάβικο Άνοιξη');
    expect(weeks['2026-11-16'].known).toBe(0.5);
  });
});
