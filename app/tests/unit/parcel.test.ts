import { describe, expect, it } from 'vitest';
import { archived, buildParcel, restored, type ParcelInput } from '../../src/parcels/parcel';
import { readPin } from '../../src/parcels/pin';

const farm = '11111111-1111-4111-8111-111111111111';
const now = '2026-11-20T10:00:00.000Z';
const input = (over: Partial<ParcelInput> = {}): ParcelInput => ({ name: 'Κάτω Κάμπος', area: '0,625', topo: undefined, pin: undefined, ...over });
const build = (i: ParcelInput) => buildParcel(i, farm, now, 'id-1');

describe('buildParcel', () => {
  it('keeps the area exactly as typed (0,625 stays 0.625, never 0.63) and sets nothing the farmer did not choose', () => {
    const r = build(input());
    expect(r).toMatchObject({ ok: true, row: { id: 'id-1', farm_id: farm, name: 'Κάτω Κάμπος', area_str: '0.625', deleted_at: null } });
    expect(r.ok && 'topo_class' in r.row).toBe(false); // no default terrain
    expect(r.ok && 'lat' in r.row).toBe(false); // no pin unless taken
  });
  it('terrain and pin are stored only when chosen', () => {
    const r = build(input({ topo: 'coast', pin: { lat: 37.9905, lng: 23.356, accuracy_m: 12.5 } }));
    expect(r).toMatchObject({ ok: true, row: { topo_class: 'coast', lat: 37.9905, lng: 23.356, pin_accuracy_m: 12.5 } });
  });
  it('a name and an area are required; an ambiguous or zero area is refused, never guessed', () => {
    expect(build(input({ name: '  ' }))).toEqual({ ok: false, name: true, area: undefined });
    expect(build(input({ area: '' }))).toEqual({ ok: false, name: false, area: 'missing' });
    for (const bad of ['1.000', '1,000', '0', '0,0', 'abc', '-2', '1e2']) expect(build(input({ area: bad })), bad).toEqual({ ok: false, name: false, area: 'invalid' });
    expect(build(input({ name: '', area: 'x' }))).toEqual({ ok: false, name: true, area: 'invalid' });
  });
});

describe('archive / restore: nothing is deleted', () => {
  it('archive sets deleted_at, restore clears it, everything else is kept', () => {
    const r = build(input());
    if (!r.ok) throw new Error('setup');
    const a = archived(r.row, '2026-11-21T00:00:00Z');
    expect(a).toMatchObject({ name: 'Κάτω Κάμπος', area_str: '0.625', deleted_at: '2026-11-21T00:00:00Z' });
    expect(restored(a, '2026-11-21T00:00:05Z').deleted_at).toBeNull();
  });
});

describe('readPin: one reading, only when asked', () => {
  it('returns the position with its accuracy', async () => {
    const geo = { getCurrentPosition: (ok: PositionCallback) => ok({ coords: { latitude: 37.99, longitude: 23.35, accuracy: 8 } } as GeolocationPosition) };
    expect(await readPin(geo)).toEqual({ known: true, value: { lat: 37.99, lng: 23.35, accuracy_m: 8 } });
  });
  it('denied, no signal or no GPS = unknown, never a made-up position', async () => {
    const denied = { getCurrentPosition: (_ok: PositionCallback, err?: PositionErrorCallback | null) => err?.({ code: 1 } as GeolocationPositionError) };
    expect(await readPin(denied)).toEqual({ known: false, reason: 'missing' });
    expect(await readPin(undefined as never)).toEqual({ known: false, reason: 'missing' });
  });
});
