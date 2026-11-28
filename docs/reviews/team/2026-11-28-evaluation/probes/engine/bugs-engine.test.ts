// Minimal FAILING tests: each asserts what RULES.md / CLAUDE.md safety rules require. A red test = a confirmed bug.
import { describe, expect, it } from 'vitest';
import { harvestForecast, runRules, supplyTable, weeklySupply, type Snapshot } from '/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/Aloni/packages/rules-core/src/index';
import { stockHits } from '/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/Aloni/packages/rules-core/src/stock';
import { salinityReading } from '/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/Aloni/packages/rules-core/src/salinity';
import { parseDecimal } from '/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/Aloni/packages/rules-core/src/decimal';
import { signedUse, snap, spray } from './helpers';

const frostParams = { tminMaxC: 2, windMaxKmh: 5, cloudMaxOktas: 2, elevationMaxM: 500, offsetC: { plain: -1, slope: 2, coastal: 1 }, leafBelowAirC: [1, 3] as const, coverGainC: [1, 2] as const };
const night = (tminC: number) => ({ night: '2026-11-20/2026-11-21', from: '2026-11-20', to: '2026-11-21', tminC, windKmh: 2, cloudOktas: 1 });

function frostWithPhiHold(): Snapshot {
  return snap({
    asOf: '2026-11-20T04:40:00Z', ruleStatus: { FROST: 'signed' },
    uses: [signedUse('mandi', 'spinach', '14', '24')],
    jobs: [spray('J1', ['PL1'], 'mandi', '2026-11-19T06:00:00Z', '2026-11-19T08:00:00Z')], // PHI 14 d -> hold until 2026-12-03T08:00Z
    frost: {
      params: frostParams, parcels: { P1: { elevationM: 24, topo: 'plain', nights: [night(1)] } }, tenderCrops: [], guardCrops: ['spinach'], coversOnHand: false,
      thaw: { firstLocalHour: 6, minLeafTempC: 0, harvestFromByPlanting: { PL1: '2026-11-18' }, hoursByParcel: { P1: [{ at: '2026-11-21T07:00:00Z', localDay: '2026-11-21', localHour: 9, tempC: 6 }] } },
    },
  });
}

describe('P0', () => {
  it('BUG-1 FROST thaw recommendation must not say phi_clear:true while PHI is running', () => {
    const out = runRules(frostWithPhiHold());
    const hold = out.find((o) => o.category === 'phi_hold');
    expect(hold?.values.safe_from).toBe('2026-12-03T08:00:00Z');
    const thaw = out.find((o) => o.category === 'no_harvest_before_thaw' && o.planting_ids.includes('PL1'));
    console.log('BUG-1 actual thaw output:', JSON.stringify(thaw));
    expect(thaw?.values.phi_clear).not.toBe(true);
  });

  it('BUG-2 PHI must not pick the SHORTER of two label rows for the same product/crop (first match wins)', () => {
    const s = snap({
      uses: [signedUse('prodX', 'spinach', '3', '24', { target: 'aphids' }), signedUse('prodX', 'spinach', '14', '48', { target: 'mildew' })],
      jobs: [spray('J1', ['PL1'], 'prodX', '2026-11-10T06:00:00Z', '2026-11-10T08:00:00Z')], // asOf 2026-11-20: 3 d over, 14 d running
    });
    const phi = runRules(s).filter((o) => o.rule_id === 'PHI');
    console.log('BUG-2 actual PHI outputs:', JSON.stringify(phi));
    expect(phi.length).toBeGreaterThan(0); // a hold (latest PHI) or a block (ambiguous label), never silence
  });
});

describe('P1', () => {
  it('BUG-3 a running PHI hold must carry a harvest veto (arbiter input), like the unknown block does', () => {
    const hold = runRules(frostWithPhiHold()).find((o) => o.category === 'phi_hold');
    console.log('BUG-3 actual phi_hold vetoes:', JSON.stringify(hold?.vetoes));
    expect(hold?.vetoes.some((v) => v.vetoed === 'harvest' && v.planting_id === 'PL1')).toBe(true);
  });

  it('BUG-4 ROT must block a draft spray that would exceed the label max applications', () => {
    const s = snap({
      asOf: '2026-11-28T10:00:00Z', products: [{ id: 'prodX', groupCode: '4' }],
      uses: [signedUse('prodX', 'spinach', '7', '24', { maxApps: 2, minIntervalDays: 7 })],
      jobs: [spray('J1', ['PL1'], 'prodX', '2026-10-01T06:00:00Z', '2026-10-01T08:00:00Z'), spray('J2', ['PL1'], 'prodX', '2026-10-20T06:00:00Z', '2026-10-20T08:00:00Z')],
      draftJobs: [{ id: 'D3', kind: 'spray', plantingIds: ['PL1'], productId: 'prodX' }],
    });
    const rot = runRules(s).filter((o) => o.rule_id === 'ROT');
    console.log('BUG-4 actual ROT outputs:', JSON.stringify(rot));
    expect(rot.some((o) => o.kind === 'block')).toBe(true);
  });

  it('BUG-5 SOW must not recommend a parcel with NO recorded history (RULES: no history = info-only)', () => {
    const s = snap({
      asOf: '2026-11-20T08:00:00Z', ruleStatus: { SOW: 'signed' },
      sowing: { cropId: 'spinach', cropFamily: 'Amaranthaceae', area: '1', sameFamilyYears: 3, diseaseYears: 3, rainDays: 2, maxRain: 10, minSoil: 2, maxSoil: 30, yieldKgPerArea: 1000, crateKg: 8, wastePercent: 10,
        parcels: [{ id: 'P9', freeArea: '5', soil: 12, history: [], diseaseHistory: [], flags: [], rain: [
          { date: '2026-11-19', mm: 0, forecast: false }, { date: '2026-11-20', mm: 0, forecast: true }, { date: '2026-11-21', mm: 0, forecast: true }] }] },
    });
    const sow = runRules(s).filter((o) => o.rule_id === 'SOW');
    console.log('BUG-5 actual SOW outputs:', JSON.stringify(sow.map((o) => ({ kind: o.kind, category: o.category, parcel_ids: o.parcel_ids }))));
    expect(sow.some((o) => o.kind === 'recommendation')).toBe(false);
  });

  it('BUG-6 FROST: a radiative night (cell Tmin 1 °C <= 2) on a slope parcel is dropped because the +2 offset is applied at R=1 before the radiative test [needs agronomist]', () => {
    const s = snap({ ruleStatus: { FROST: 'signed' }, frost: { params: frostParams, parcels: { P2: { elevationM: 80, topo: 'slope', nights: [night(1)] } }, tenderCrops: [], guardCrops: [], coversOnHand: false } });
    const f = runRules(s).filter((o) => o.rule_id === 'FROST');
    console.log('BUG-6 actual FROST outputs:', JSON.stringify(f));
    expect(f.length).toBeGreaterThan(0); // at least «radiative night, parcel Tmin 1..3 °C (EST)»; silence reads as «no frost»
  });
});

describe('P2', () => {
  const stockFacts = (lots: { qty: string; unit: string; expiry?: string }[], need = { area: '10', dose: '0.1', unit: 'L' }) => ({
    lots: lots.map((l) => ({ productId: 'prodX', qty: parseDecimal(l.qty), unit: l.unit, expiry: l.expiry })),
    planned: [{ id: 'PJ', productId: 'prodX', areaStr: parseDecimal(need.area), dosePerStr: parseDecimal(need.dose), doseUnit: need.unit }],
    labelDose: {}, lowFactor: parseDecimal('2'), expiringDays: 30,
  });
  it('BUG-7 STOCK: a second lot in another unit REPLACES the first (0.5 L + 200 ml vs 1 L needed -> silent)', () => {
    const hits = stockHits(stockFacts([{ qty: '0.5', unit: 'L', expiry: '2027-06-01' }, { qty: '200', unit: 'ml', expiry: '2027-06-01' }]), '2026-11-20T10:00:00Z');
    console.log('BUG-7 actual:', JSON.stringify(hits));
    expect(hits.length).toBeGreaterThan(0); // insufficient (0.5 L < 1 L) or «units differ: unknown», never silence
  });
  it('BUG-8 STOCK: a lot with NO expiry (or an impossible one, V8 rolls 2026-02-30 to 03-02) counts fully as usable supply, no prompt', () => {
    const hits = stockHits(stockFacts([{ qty: '5', unit: 'L', expiry: '2026-02-30' }]), '2026-11-20T10:00:00Z');
    console.log('BUG-8 actual:', JSON.stringify(hits));
    // expected: the expiry is unreadable -> the lot is not counted as supply (or is flagged unknown); actual: it was «expired» only by luck of V8 rollover
    // stronger probe: an unknown (undefined) expiry also counts fully as supply:
    const hits2 = stockHits(stockFacts([{ qty: '5', unit: 'L' }]), '2026-11-20T10:00:00Z');
    console.log('BUG-8b actual (no expiry):', JSON.stringify(hits2));
    expect(hits2.some((h) => String(h.category).includes('unknown') || h.category === 'stock_insufficient')).toBe(true);
  });
  it('BUG-9 STOCK: a product whose only lot has an UNKNOWN quantity gives no output (unknown read as fine)', () => {
    const f = stockFacts([]); (f.lots as unknown[]).push({ productId: 'prodX', qty: parseDecimal(''), unit: 'L', expiry: '2027-01-01' });
    const hits = stockHits(f, '2026-11-20T10:00:00Z');
    console.log('BUG-9 actual:', JSON.stringify(hits));
    expect(hits.length).toBeGreaterThan(0);
  });
  it('BUG-10 weeklySupply / harvestForecast: a duplicated planting row is counted twice (supply 80 instead of 40)', () => {
    const p = { id: 'PL1', cropId: 'spinach', harvestFrom: '2026-11-20', harvestTo: '2026-11-22', estimatedCrates: 40, loggedCrates: 0, wait: 'clear' as const };
    const w = weeklySupply({ cropId: 'spinach', today: '2026-11-20', plantings: [p, { ...p }], orders: { '2026-11-16': 60 } }, 1);
    const f = harvestForecast('2026-11-20', [p, { ...p }]);
    console.log('BUG-10 actual weeklySupply:', JSON.stringify(w), 'harvestForecast crates7:', f?.crates7);
    expect(w[0].eligible).toBe(40);
  });
  it('BUG-17 PHI: a spray whose end is BEFORE its start is accepted and the wait counts from the earlier time (4 h short here)', () => {
    const s = snap({ asOf: '2026-11-26T07:00:00Z', uses: [signedUse('p', 'spinach', '7', '24')], jobs: [spray('J', ['PL1'], 'p', '2026-11-19T10:00:00Z', '2026-11-19T06:00:00Z')] });
    const phi = runRules(s).filter((o) => o.rule_id === 'PHI');
    console.log('BUG-17 actual PHI outputs:', JSON.stringify(phi));
    expect(phi.some((o) => o.category === 'phi_blocked_unknown' || o.category === 'phi_hold')).toBe(true);
  });
  it('BUG-11 SOW: a stale 0 mm forecast row for a past day overrides the measured 30 mm (Map keeps the last row)', () => {
    const s = snap({
      asOf: '2026-11-20T08:00:00Z', ruleStatus: { SOW: 'signed' },
      sowing: { cropId: 'spinach', cropFamily: 'Amaranthaceae', area: '1', sameFamilyYears: 3, diseaseYears: 3, rainDays: 2, maxRain: 10, minSoil: 2, maxSoil: 30, yieldKgPerArea: 1000, crateKg: 8, wastePercent: 10,
        parcels: [{ id: 'P9', freeArea: '5', soil: 12, history: [{ family: 'Asteraceae', date: '2025-05' }], diseaseHistory: [], flags: [], rain: [
          { date: '2026-11-19', mm: 30, forecast: false }, { date: '2026-11-19', mm: 0, forecast: true }, { date: '2026-11-20', mm: 0, forecast: true }] }] },
    });
    const sow = runRules(s).filter((o) => o.rule_id === 'SOW');
    console.log('BUG-11 actual:', JSON.stringify(sow.map((o) => ({ kind: o.kind, category: o.category, window: o.window }))));
    expect(sow.some((o) => o.kind === 'recommendation')).toBe(false);
  });
  it('BUG-12 REG dose: a draft spray with NO dose check is not blocked (dose unknown read as pass)', () => {
    const s = snap({ uses: [signedUse('prodX', 'spinach', '7', '24')], products: [{ id: 'prodX', groupCode: '4' }], draftJobs: [{ id: 'D1', kind: 'spray', plantingIds: ['PL1'], productId: 'prodX' }] });
    const blocks = runRules(s).filter((o) => o.kind === 'block');
    console.log('BUG-12 actual blocks:', JSON.stringify(blocks.map((o) => `${o.rule_id}/${o.category}`)));
    expect(blocks.some((o) => o.rule_id === 'REG')).toBe(true);
  });
  it('BUG-13 PHI-GUARD: draft spray whose PHI ends after harvest_from on a growing planting raises nothing [buffer needs agronomist]', () => {
    const s = snap({ ruleStatus: { 'PHI-GUARD': 'signed' }, uses: [signedUse('prodX', 'spinach', '14', '24')], products: [{ id: 'prodX', groupCode: '4' }],
      draftJobs: [{ id: 'D1', kind: 'spray', plantingIds: ['PL1'], productId: 'prodX' }],
      harvestGuard: [{ plantingId: 'PL1', status: 'growing', harvestFrom: '2026-11-23', harvestTo: '2026-12-10' }] });
    const g = runRules(s).filter((o) => o.rule_id === 'PHI-GUARD');
    console.log('BUG-13 actual:', JSON.stringify(g));
    expect(g.length).toBeGreaterThan(0);
  });
});

describe('P3', () => {
  it('BUG-14 SALT uses the UTC date, not the Athens farm day (sample of «today» Athens = unknown)', () => {
    const r = salinityReading({ parcelId: 'P1', sampledOn: '2026-12-01', waterEcDsM: 1.2, coastalWell: false }, '2026-11-30T22:30:00Z', 12);
    console.log('BUG-14 actual:', JSON.stringify(r));
    expect(r).toBeDefined();
  });
  it('BUG-15 a rule with NO status entry shows nothing (FROST): neither info nor alert, which reads as «all clear»', () => {
    const s = snap({ parcelsForInfo: ['P1'], frost: { params: frostParams, parcels: { P1: { elevationM: 24, topo: 'plain', nights: [night(-3)] } }, tenderCrops: [], guardCrops: [], coversOnHand: false } });
    const f = runRules(s).filter((o) => o.rule_id === 'FROST');
    console.log('BUG-15 actual:', JSON.stringify(f));
    expect(f.length).toBeGreaterThan(0);
  });
  it('BUG-16 supplyTable(asOf instant) takes the UTC date: Mon 00:30 Athens lands in the previous ISO week', () => {
    const rows = supplyTable('2026-11-15T22:30:00Z', 1, [], { cropId: 'x', cratesPerWeek: 1, multipliers: [] });
    console.log('BUG-16 actual first week:', rows[0].week);
    expect(rows[0].week).toBe('2026-11-16');
  });
});
