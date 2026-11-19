import { describe, expect, it } from 'vitest';
import { buildParcel } from '../../src/parcels/parcel';
import { buildPlanting } from '../../src/plantings/planting';
import { buildReceipt } from '../../src/stock/stock';

describe('T17b: implausible numbers are refused with a reason', () => {
  it('a parcel of 99999999999 στρ. is refused as implausible; 10000 is still allowed', () => {
    const big = buildParcel({ name: 'A', area: '99999999999', topo: undefined, pin: undefined }, 'f', '2026-11-19T10:00:00Z', 'p1');
    expect(big.ok).toBe(false);
    if (!big.ok) expect(big.area).toBe('implausible');
    expect(buildParcel({ name: 'A', area: '10000', topo: undefined, pin: undefined }, 'f', '2026-11-19T10:00:00Z', 'p2').ok).toBe(true);
  });
  it('a planting area of 99999999999 is refused too', () => {
    const r = buildPlanting({ parcelId: 'p', cropId: 'c', variety: '', lot: '', area: '99999999999', sownOn: '2026-11-19', status: 'growing' }, 'f', '2026-11-19T10:00:00Z', 'x');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.area).toBe('implausible');
  });
  it('stock quantity 1,250 is refused as a quantity (invalid); 1,25 and 1250 are accepted', () => {
    const ok = (qty: string) => buildReceipt({ productId: 'p', qty, expiry: '2027-06-30', batch: '' } as never, 'f', '2026-11-19T10:00:00Z', { lot: 'l', movement: 'm' });
    const bad = ok('1,250');
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.qty).toBe('invalid');
    expect(ok('1,25').ok).toBe(true);
    expect(ok('1250').ok).toBe(true);
  });
});
