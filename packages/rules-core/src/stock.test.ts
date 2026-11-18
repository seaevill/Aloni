import { describe, expect, it } from 'vitest';
import { addDecimal, mulDecimal, parseDecimal, type Decimal } from './decimal';
import { runRules, type Snapshot } from './engine';
import { known } from './known';
import { athensDate, stockHits, type StockFacts } from './stock';

const d = (s: string): Decimal => { const r = parseDecimal(s); if (!r.known) throw new Error(s); return r.value; };
const base = (over: Partial<StockFacts>): StockFacts => ({ lots: over.lots ?? [], planned: over.planned ?? [], labelDose: over.labelDose ?? {}, lowFactor: known(d('2')), expiringDays: THIRTY });
const lot = (productId: string, qty: string, expiry?: string) => ({ productId, qty: parseDecimal(qty), unit: 'L', expiry });
const plan = (productId: string, area: string, dose: string) => ({ id: 'j', productId, areaStr: parseDecimal(area), dosePerStr: parseDecimal(dose), doseUnit: 'L' });
const NOW = '2026-11-16T04:40:00Z'; // 06:40 in Athens
const THIRTY = JSON.parse('30') as number; // the [SET] window of the golden cases (test data, not a default)

describe('exact decimals (a dose is never rounded)', () => {
  it('multiplies and adds without floating point and keeps the canonical text', () => {
    expect(mulDecimal(d('1.5'), d('0.06'))).toBe('0.09');
    expect(mulDecimal(d('0.09'), d('2'))).toBe('0.18');
    expect(mulDecimal(d('12'), d('0.025'))).toBe('0.3');
    expect(addDecimal(d('0.1'), d('0.25'))).toBe('0.35');
    expect(addDecimal(d('0.7'), d('0.3'))).toBe('1');
  });
});

describe('STOCK', () => {
  it('not enough for the next planned spray is a BLOCK, not a «low» alert', () => {
    const h = stockHits(base({ lots: [lot('P', '0.05')], planned: [plan('P', '1.5', '0.06')] }), NOW);
    expect(h).toEqual([{ productId: 'P', category: 'stock_insufficient', values: { qty: '0.05', next_use_qty: '0.09', unit: 'L', sufficient_for_next_job: false } }]);
  });

  it('an expired lot is not supply: it is reported as expired and does not count towards «enough»', () => {
    const h = stockHits(base({ lots: [lot('P', '0.2', '2026-10-31'), lot('P', '0.05')], planned: [plan('P', '1.5', '0.06')] }), NOW);
    expect(h.map((x) => x.category).sort()).toEqual(['stock_expired', 'stock_insufficient']);
  });

  it('plenty on the shelf says nothing; two lots are added exactly', () => {
    expect(stockHits(base({ lots: [lot('P', '0.1'), lot('P', '0.1')], planned: [plan('P', '1.5', '0.06')] }), NOW)).toEqual([]);
    expect(stockHits(base({ lots: [lot('P', '0.1'), lot('P', '0.07')], planned: [plan('P', '1.5', '0.06')] }), NOW)[0]).toMatchObject({ category: 'stock_low', values: { qty: '0.17', threshold_qty: '0.18' } });
  });

  it('a missing or unreadable input gives NO alert (it cannot be judged), never a guessed one', () => {
    expect(stockHits(base({ lots: [lot('P', ''), lot('Q', '0,5')], planned: [plan('P', '1.5', '0.06'), plan('Q', '', '0.06')] }), NOW)).toEqual([]);
    expect(stockHits(base({ lots: [lot('P', '0.1')], planned: [{ ...plan('P', '1.5', '0.06'), doseUnit: 'kg' }] }), NOW)).toEqual([]); // another unit: not compared
    expect(stockHits(base({ lots: [lot('P', '0.1', 'soon')], planned: [] }), NOW)).toEqual([]);          // a date that is not a date
  });

  it('the day is the Athens day, not the UTC day, and the expiring window is inclusive', () => {
    expect(athensDate('2026-11-16T22:30:00Z')).toBe('2026-11-17');
    expect(stockHits(base({ lots: [lot('P', '1', '2026-12-16')] }), NOW)[0]?.values.days_left).toBe(30);
    expect(stockHits(base({ lots: [lot('P', '1', '2026-12-17')] }), NOW)).toEqual([]);
    expect(stockHits(base({ lots: [lot('P', '1', '2026-11-16')] }), NOW)[0]?.category).toBe('stock_expiring'); // expires today: still usable today
  });

  it('while the thresholds are UNSIGNED it only shows its inputs: no alert, no severity, no notification', () => {
    const s = { asOf: NOW, plantings: [], jobs: [], uses: [], tasks: [], parcelsForInfo: [], draftJobs: [], products: [], ruleStatus: { STOCK: 'unsigned' as const }, stock: base({ lots: [lot('P', '0.01', '2026-01-01')], planned: [plan('P', '1.5', '0.06')] }) } satisfies Snapshot;
    const out = runRules(s);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ rule_id: 'STOCK', kind: 'info', category: 'stock_inputs', notify: false });
    expect(out[0]?.severity).toBeUndefined();
  });
});
