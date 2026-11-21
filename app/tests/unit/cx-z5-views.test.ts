import { expect, it } from 'vitest';
import { HarvestHeat } from '../../src/ui/cx/HarvestHeat';
import { MonthRing } from '../../src/ui/cx/MonthRing';
import { TipsCard } from '../../src/ui/cx/TipsCard';

it('exports independently renderable views with stable root markers', () => {
  expect(HarvestHeat({ heading: 'Harvest', weeks: [], rows: [], unknown: 'Unknown', empty: 'Parcel' }).props['data-testid']).toBe('harvest-heat');
  expect(MonthRing({ heading: 'Months', months: [], recorded: [], empty: 'No records' }).props['data-testid']).toBe('month-ring');
  expect(TipsCard({ heading: 'Tips', banner: 'Information', content: { tips: '', strength: '', weakness: '', problems: [] } }).props['data-testid']).toBe('tips-card');
});
