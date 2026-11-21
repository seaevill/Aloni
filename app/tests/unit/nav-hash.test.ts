import { describe, expect, it } from 'vitest';
import { hashOf, parseHash, savedState } from '../../src/ui/nav';

describe('the address says where you are (T7)', () => {
  it('writes and reads #/<own|demo>/<tab>; anything else is ignored', () => {
    expect(hashOf('demo', 'stock')).toBe('#/demo/stock'); expect(parseHash('#/demo/stock')).toEqual({ farm: 'demo', tab: 'stock' });
    for (const bad of ['', '#', '#/x/today', '#/own/nowhere', '#/own/today/extra', '#/own']) expect(parseHash(bad)).toBeUndefined();
  });
  it('the saved device state is trusted only in its exact shape', () => {
    expect(savedState({ farm: 'own', tab: 'more' })).toEqual({ farm: 'own', tab: 'more' });
    for (const bad of [null, undefined, {}, { farm: 'demo' }, { farm: 'x', tab: 'today' }, { farm: 'own', tab: 'nope' }]) expect(savedState(bad)).toBeUndefined();
  });
});

describe('sheet addresses (#/<farm>/<tab>/sheet/<kind>/<id>)', () => {
  it('a sheet rides on the tab address and comes back from it', () => {
    expect(hashOf('own', 'today', { kind: 'crop', id: 'abc-123' })).toBe('#/own/today/sheet/crop/abc-123');
    expect(parseHash('#/own/today/sheet/crop/abc-123')).toEqual({ farm: 'own', tab: 'today', sheet: { kind: 'crop', id: 'abc-123' } });
    expect(parseHash('#/demo/parcels/sheet/weather/p_1')).toEqual({ farm: 'demo', tab: 'parcels', sheet: { kind: 'weather', id: 'p_1' } });
  });
  it('the old addresses still work and carry no sheet; a malformed sheet is dropped, never half-read', () => {
    expect(parseHash('#/own/stock')).toEqual({ farm: 'own', tab: 'stock' });
    expect(hashOf('own', 'stock')).toBe('#/own/stock');
    expect(parseHash('#/own/today/sheet/crop')).toBeUndefined();
    expect(parseHash('#/own/today/sheet/Crop/x y')).toBeUndefined();
    expect(parseHash('#/own/today/sheet//x')).toBeUndefined();
  });
});
