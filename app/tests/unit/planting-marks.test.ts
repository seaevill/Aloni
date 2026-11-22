import { describe, expect, it } from 'vitest';
import { plantingMarks } from '../../src/plantings/marks';

describe('plantingMarks: where each planting sits in the parcel sketch (illustrative strips)', () => {
  it('splits the parcel width by the plantings\' areas, in order, leaving the rest empty', () => {
    const m = plantingMarks('4', [{ id: 'a', area: '1' }, { id: 'b', area: '2,5' }]);
    expect(m).toEqual([{ id: 'a', from: 0, to: 0.25 }, { id: 'b', from: 0.25, to: 0.875 }]);
  });
  it('shows nothing when the parcel area or a planting area is unreadable, or the plantings exceed the parcel', () => {
    expect(plantingMarks('', [{ id: 'a', area: '1' }])).toEqual([]);
    expect(plantingMarks('4', [{ id: 'a', area: 'x' }])).toEqual([]);
    expect(plantingMarks('4', [{ id: 'a', area: '3' }, { id: 'b', area: '2' }])).toEqual([]);
    expect(plantingMarks('0', [{ id: 'a', area: '1' }])).toEqual([]);
  });
});
