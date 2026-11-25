import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { addItem, loadPlans } from '../../src/fert/plan';
import { fertCalc } from '../../src/fert/calc';
import { newDb, TEST_FARM_ID as F } from '../helpers/factories';

describe('fertiliser bags = the amount the agronomist wrote × the area ÷ the bag size; the app proposes no amount', () => {
  it('an item may carry the amount (kg per στρέμμα) and the bag size (kg) exactly as typed, next to his words', async () => {
    const db = await newDb();
    await addItem(db, F, 'pl1', { day: '20', text: 'his line', kgPerStr: '4,5', bagKg: '25' }, 'i1');
    expect((await loadPlans(db, F)).pl1?.items[0]).toEqual({ id: 'i1', day: '20', text: 'his line', kg_per_str: '4,5', bag_kg: '25' });
  });
  it('the amount and the bag size are optional; when typed they must be numbers above 0', async () => {
    const db = await newDb();
    await addItem(db, F, 'pl1', { day: '20', text: 'only words' }, 'i1');
    expect((await loadPlans(db, F)).pl1?.items[0]).toEqual({ id: 'i1', day: '20', text: 'only words' });
    await expect(addItem(db, F, 'pl1', { day: '20', text: 'x', kgPerStr: 'abc' }, 'i2')).rejects.toThrow();
    await expect(addItem(db, F, 'pl1', { day: '20', text: 'x', kgPerStr: '0' }, 'i2')).rejects.toThrow();
    await expect(addItem(db, F, 'pl1', { day: '20', text: 'x', kgPerStr: '4', bagKg: '-5' }, 'i2')).rejects.toThrow();
  });
  it('total kg = the amount × the area, exact; bags = total ÷ bag size counted up (a partly used bag is still a bag)', () => {
    expect(fertCalc({ kg_per_str: '4,5', bag_kg: '25' }, '2')).toEqual({ known: true, kg: '9', bags: { known: true, count: '1' } });
    expect(fertCalc({ kg_per_str: '20', bag_kg: '25' }, '2,5')).toEqual({ known: true, kg: '50', bags: { known: true, count: '2' } });
    expect(fertCalc({ kg_per_str: '20', bag_kg: '25' }, '2,6')).toEqual({ known: true, kg: '52', bags: { known: true, count: '3' } });
  });
  it('no amount = no calculation; no bag size = the kilos only; a missing or bad area = unknown, never 0', () => {
    expect(fertCalc({}, '2')).toEqual({ known: false, reason: 'no-amount' });
    expect(fertCalc({ kg_per_str: '4,5' }, '2')).toEqual({ known: true, kg: '9', bags: { known: false } });
    expect(fertCalc({ kg_per_str: '4,5', bag_kg: '25' }, '')).toEqual({ known: false, reason: 'no-area' });
    expect(fertCalc({ kg_per_str: '4,5', bag_kg: '25' }, 'x')).toEqual({ known: false, reason: 'no-area' });
  });
});
