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
