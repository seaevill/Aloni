import { describe, expect, it } from 'vitest';
import { harvestForecast, type HarvestForecastPlanting } from './harvestForecast';

const spinach: HarvestForecastPlanting = {
  id: 'PL01', cropId: 'spinach', harvestFrom: '2026-11-10', harvestTo: '2026-11-28',
  estimatedCrates: 225, loggedCrates: 74, wait: 'clear',
};

describe('v2 harvest forecast', () => {
  it('spreads remaining crates across the open harvest range from the Athens day', () => {
    const forecast = harvestForecast('2026-11-16', [spinach]);
    expect(forecast).toEqual({
      kind: 'info', notify: false, from: '2026-11-16',
      crates7: 151 * 7 / 13, crates28: 151,
      crops: [{ cropId: 'spinach', crates7: 151 * 7 / 13, crates28: 151 }],
      heldIds: [], unknownIds: [],
    });
  });

  it('excludes held and missing eligibility, with exact boundaries and no decision', () => {
    const forecast = harvestForecast('2026-11-16', [
      { ...spinach, id: 'held', wait: 'held' },
      { ...spinach, id: 'unknown', wait: 'unknown' },
      { ...spinach, id: 'bad-date', harvestTo: '2026-11-31' },
      { ...spinach, id: 'bad-estimate', estimatedCrates: undefined },
      { ...spinach, id: 'eighth', harvestFrom: '2026-11-23', harvestTo: '2026-11-23' },
      { ...spinach, id: 'twenty-ninth', harvestFrom: '2026-12-14', harvestTo: '2026-12-14' },
    ]);
    expect(forecast).toEqual({
      kind: 'info', notify: false, from: '2026-11-16', crates7: 0, crates28: 151,
      crops: [{ cropId: 'spinach', crates7: 0, crates28: 151 }],
      heldIds: ['held'], unknownIds: ['unknown', 'bad-date', 'bad-estimate'],
    });
    expect(harvestForecast('2026-11-31', [spinach])).toBeUndefined();
  });
});
