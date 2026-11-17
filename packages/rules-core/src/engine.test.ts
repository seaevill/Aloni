
describe('REG and ROT: a draft spray never covers beds that are not on a signed label, and a missing value is never «cleared»', () => {
  const two = [{ id: 'pl', parcelId: 'p', cropId: 'crop' }, { id: 'pl2', parcelId: 'p', cropId: 'other' }];
  const draft = { id: 'd', kind: 'spray', plantingIds: ['pl', 'pl2'], productId: 'prod' };
  it('only the planting whose crop is on the signed label is allowed; the others are excluded one by one', () => {
    const o = runRules(snap({ plantings: two, draftJobs: [draft], jobs: [] })).filter((x) => x.rule_id === 'REG');
    expect(o).toHaveLength(1);
    expect(o[0]).toMatchObject({ kind: 'block', values: { allowed_planting_ids: ['pl'], exclude_planting_ids: ['pl2'] }, vetoes: [{ by: 'REG', vetoed: 'spray', planting_id: 'pl2', reason: 'not_on_label' }] });
  });
  it('an UNSIGNED label registers nothing: every bed is excluded', () => {
    const o = runRules(snap({ plantings: two, draftJobs: [draft], jobs: [], uses: [use('7', '24', false)] })).filter((x) => x.rule_id === 'REG');
    expect(o[0].values.allowed_planting_ids).toEqual([]);
  });
  it('rotation: no group code, no maximum applications or no minimum interval = unknown, listed, never «pass»', () => {
    const o = runRules(snap({ draftJobs: [{ ...draft, plantingIds: ['pl'] }], jobs: [], products: [{ id: 'prod', groupCode: undefined }] })).filter((x) => x.rule_id === 'ROT');
    expect(o).toHaveLength(1);
    expect(o[0].values).toEqual({ status: 'unknown', missing: ['group_code', 'max_apps', 'min_interval_days'] });
    const full = runRules(snap({ draftJobs: [{ ...draft, plantingIds: ['pl'] }], jobs: [], products: [{ id: 'prod', groupCode: '40' }], uses: [{ ...use('7', '24', true), maxApps: 3, minIntervalDays: 7 }] }));
    expect(full.some((x) => x.rule_id === 'ROT')).toBe(false); // nothing missing: this rule has nothing to block (the interval check itself arrives with the signed rule)
  });
});
