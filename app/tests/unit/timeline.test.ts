import { describe, expect, it } from 'vitest';
import { parcelTimeline, TIMELINE_MAX } from '../../src/summary/timeline';
import type { Row } from '../../src/db/schema';

const planting = (id: string, parcel: string, crop: string, sown: string): Row => ({ id, farm_id: 'f', parcel_id: parcel, crop_id: crop, sown_on: sown, area_str: '0.5', status: 'growing' });
const spray = (id: string, job: string, at: string, product: string, extra: Record<string, unknown> = {}): Row => ({ id, farm_id: 'f', job_id: job, product_id: product, sprayed_at: at, ...extra });
const harvest = (id: string, plantingId: string, at: string, crates: string): Row => ({ id, farm_id: 'f', planting_id: plantingId, harvested_at: at, crates_str: crates });
const link = (job: string, plantingId: string): Row => ({ id: `${job}-${plantingId}`, farm_id: 'f', job_id: job, planting_id: plantingId });
const names = { crop: (id: unknown) => `crop:${String(id)}`, product: (id: unknown) => `product:${String(id)}` };

describe('the parcel timeline: one read-only stream of what happened on THIS parcel, newest first', () => {
  const plantings = [planting('p1', 'A', 'c1', '2026-10-01'), planting('p2', 'B', 'c2', '2026-10-05')];
  const links = [link('j1', 'p1'), link('j2', 'p2')];
  const sprays = [spray('s1', 'j1', '2026-11-10T08:00:00.000Z', 'x', { phi_until: '2026-11-17T08:00:00.000Z', rei_until: '2026-11-11T08:00:00.000Z' }), spray('s2', 'j2', '2026-11-12T08:00:00.000Z', 'y')];
  const harvests = [harvest('h1', 'p1', '2026-11-20T06:00:00.000Z', '3'), harvest('h2', 'p2', '2026-11-21T06:00:00.000Z', '9')];

  it('contains sowing, sprayings and harvests of the parcel (and of no other parcel), newest first', () => {
    const e = parcelTimeline('A', plantings, links, sprays, harvests, names);
    expect(e.map((x) => `${x.kind}:${x.id}`)).toEqual(['harvest:h1', 'spray:s1', 'sown:p1']);
    expect(parcelTimeline('B', plantings, links, sprays, harvests, names).map((x) => x.kind)).toEqual(['harvest', 'spray', 'sown']);
  });
  it('shows what the records say and nothing else: the stored end of the waiting periods, or nothing when none is stored', () => {
    const [, s] = parcelTimeline('A', plantings, links, sprays, harvests, names);
    expect(s).toMatchObject({ kind: 'spray', product: 'product:x', phiUntil: '2026-11-17T08:00:00.000Z', reiUntil: '2026-11-11T08:00:00.000Z' });
    const b = parcelTimeline('B', plantings, links, sprays, harvests, names).find((x) => x.kind === 'spray');
    expect(b).toBeDefined();
    expect('phiUntil' in b!).toBe(false);                                                        // never invented: absent = unknown
    expect('reiUntil' in b!).toBe(false);
  });
  it('a harvest carries the crates exactly as recorded; a removed planting leaves the stream', () => {
    const h = parcelTimeline('A', plantings, links, sprays, harvests, names)[0];
    expect(h).toMatchObject({ kind: 'harvest', crop: 'crop:c1', crates: '3' });
    expect(parcelTimeline('A', [{ ...plantings[0]!, deleted_at: '2026-11-22T00:00:00.000Z' }], links, sprays, harvests, names)).toEqual([]);
  });
  it.each([
    ['23:30 winter', '2026-11-20', '2026-11-20T21:30:00Z'],
    ['00:30 winter', '2026-11-21', '2026-11-20T22:30:00Z'],
    ['00:30 summer', '2026-07-21', '2026-07-20T21:30:00Z'],
  ])('sorts same-day events by Athens time at %s', (_case, sown, at) => {
    const events = parcelTimeline('A', [planting('p1', 'A', 'c1', sown)], links,
      [spray('s1', 'j1', at, 'x')], [], names);
    expect(events.map((event) => [event.kind, event.at])).toEqual([['spray', at], ['sown', sown]]);
  });
  it('orders equal instants by kind and id even when timestamps have different offsets', () => {
    const events = parcelTimeline('A', [planting('p1', 'A', 'c1', '2026-07-21')], links,
      [spray('s2', 'j1', '2026-07-21T00:00:00+03:00', 'x'), spray('s1', 'j1', '2026-07-20T21:00:00.000Z', 'x')],
      [harvest('h1', 'p1', '2026-07-20T21:00:00Z', '3')], names);
    expect(events.map((event) => event.id)).toEqual(['h1', 's1', 's2', 'p1']);
  });
  it('is capped so the screen stays short', () => {
    const many = Array.from({ length: TIMELINE_MAX + 10 }, (_, i) => harvest(`h${i}`, 'p1', `2026-11-${String(1 + (i % 28)).padStart(2, '0')}T06:00:00.000Z`, '1'));
    expect(parcelTimeline('A', plantings, links, [], many, names)).toHaveLength(TIMELINE_MAX);
  });
  it('a cut / clean record of THIS parcel is part of the stream, with its method', () => {
    const cuts = [{ id: 'c1', day: '2026-11-21', method: 'shredder' as const }];
    const e = parcelTimeline('A', plantings, links, sprays, harvests, names, cuts);
    expect(e.map((x) => `${x.kind}:${x.id}`)).toEqual(['cut:c1', 'harvest:h1', 'spray:s1', 'sown:p1']);
    expect(e[0]).toMatchObject({ kind: 'cut', method: 'shredder', at: '2026-11-21' });
  });
});

describe('the parcel timeline also carries fertilising, irrigation and observations of THIS parcel (only what is stored)', () => {
  const plantings = [planting('p1', 'A', 'c1', '2026-10-01')];
  const work = [
    { id: 'w1', parcel_id: 'A', kind: 'fertilise' as const, day: '2026-11-12', n_form: 'ουρία', n_kg_per_str: '4,5' },
    { id: 'w2', parcel_id: 'A', kind: 'irrigate' as const, day: '2026-11-15', m3: '3,5' },
    { id: 'w3', parcel_id: 'B', kind: 'irrigate' as const, day: '2026-11-16', m3: '9' },
  ];
  const obs: Row[] = [
    { id: 'o1', farm_id: 'f', parcel_id: 'A', kind: 'pest', observed_at: '2026-11-14T08:00:00.000Z', note: 'κηλίδες' },
    { id: 'o2', farm_id: 'f', parcel_id: 'A', kind: 'dew', observed_at: '2026-11-13T08:00:00.000Z', deleted_at: '2026-11-13T09:00:00Z' },
    { id: 'o3', farm_id: 'f', parcel_id: 'B', kind: 'dew', observed_at: '2026-11-13T08:00:00.000Z' },
  ];
  it('orders them newest first with the other events, keeps each record as typed, and leaves out other parcels and deleted observations', () => {
    const e = parcelTimeline('A', plantings, [], [], [], names, [], { work, observations: obs });
    expect(e.map((x) => `${x.kind}:${x.id}`)).toEqual(['irrigate:w2', 'observation:o1', 'fertilise:w1', 'sown:p1']);
    expect(e[0]).toMatchObject({ m3: '3,5' });
    expect(e[2]).toMatchObject({ nForm: 'ουρία', kgPerStr: '4,5' });
    expect(e[1]).toMatchObject({ what: 'pest', note: 'κηλίδες' });
  });
  it('a record without a quantity shows no quantity (never a zero)', () => {
    const e = parcelTimeline('A', plantings, [], [], [], names, [], { work: [{ id: 'w', parcel_id: 'A', kind: 'irrigate', day: '2026-11-15', minutes: '40' }] });
    const i = e.find((x) => x.kind === 'irrigate');
    expect(i).toBeDefined();
    expect('m3' in i!).toBe(false);
  });
});
