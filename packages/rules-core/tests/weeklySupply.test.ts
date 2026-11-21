import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { weeklySupply } from '../src/weeklySupply';
import type { HarvestForecastPlanting } from '../src/harvestForecast';

const source = JSON.parse(readFileSync(new URL('../../../reference/prototype/data.json', import.meta.url), 'utf8')) as {
  orders_weekly: { crop_id: string; crates_per_week: number }[];
  plantings: { crop_id: string; id: string; harvest_from: string; harvest_to: string; est_crates: number }[];
};
const spinach: HarvestForecastPlanting[] = source.plantings.filter((p) => p.crop_id === 'spinach').map((p) => ({
  id: p.id, cropId: p.crop_id, harvestFrom: p.harvest_from, harvestTo: p.harvest_to, estimatedCrates: p.est_crates,
  loggedCrates: p.id === 'PL01' ? 74 : 0, wait: 'clear',
}));

describe('weekly supply', () => {
  it('projects the first four V2 spinach baseline weeks from recorded estimates', () => {
    const weeks = ['2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07'];
    const baseline = source.orders_weekly.find((order) => order.crop_id === 'spinach')!.crates_per_week;
    const orders = Object.fromEntries(weeks.map((week) => [week, baseline]));
    const eligible = [151 * 7 / 13, 151 * 6 / 13, 225 * 4 / 20, 225 * 7 / 20];
    expect(weeklySupply({ cropId: 'spinach', today: '2026-11-16', plantings: spinach, orders }))
      .toEqual(weeks.map((week, i) => ({ week, orders: baseline, eligible: eligible[i], heldOrUnknown: 0, delta: eligible[i] - baseline })));
  });

  it('preserves null order data and holds separately even when all lots are held', () => {
    const plantings = spinach.map((p): HarvestForecastPlanting => ({ ...p, wait: 'held' }));
    expect(weeklySupply({ cropId: 'spinach', today: '2026-11-16', plantings }, 1))
      .toEqual([{ week: '2026-11-16', orders: null, eligible: 0, heldOrUnknown: 151 * 7 / 13, delta: null }]);
    const unknown = spinach.map((p): HarvestForecastPlanting => ({ ...p, wait: 'unknown' }));
    expect(weeklySupply({ cropId: 'spinach', today: '2026-11-16', plantings: unknown }, 1))
      .toEqual([{ week: '2026-11-16', orders: null, eligible: null, heldOrUnknown: 151 * 7 / 13, delta: null }]);
    expect(weeklySupply({ cropId: 'spinach', today: '2026-11-16', plantings: [] }, 1))
      .toEqual([{ week: '2026-11-16', orders: null, eligible: null, heldOrUnknown: null, delta: null }]);
  });
});
