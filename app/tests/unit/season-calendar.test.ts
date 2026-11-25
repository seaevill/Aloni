import { expect, it } from 'vitest';
import { seasonMonths } from '../../src/summary/season-calendar';

it('counts Athens month edges and keeps records in the selected farm and crop', () => {
  const plantings = [
    { id: 'p', farm_id: 'own', crop_id: 'crop', sown_on: '2026-03-31' },
    { id: 'd', farm_id: 'demo', crop_id: 'crop', sown_on: '2026-04-01' },
  ];
  const harvests = [
    { id: 'before', farm_id: 'own', planting_id: 'p', harvested_at: '2026-03-31T20:59:59Z' },
    { id: 'after', farm_id: 'own', planting_id: 'p', harvested_at: '2026-03-31T21:00:00Z' },
    { id: 'bad', farm_id: 'own', planting_id: 'p', harvested_at: 'unreadable' },
    { id: 'demo', farm_id: 'demo', planting_id: 'p', harvested_at: '2026-04-01T10:00:00Z' },
  ];
  const model = seasonMonths('own', 'crop', plantings, harvests);
  expect(model.months).toHaveLength(12);
  expect(model.months[2]).toEqual({ sown: 1, harvested: 1 });
  expect(model.months[3]).toEqual({ sown: 0, harvested: 1 });
  expect(model.undated).toBe(1);
});
