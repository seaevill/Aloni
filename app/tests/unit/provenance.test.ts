import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseDays, provenance, SOURCE_NAME, STALE_AFTER_HOURS } from '../../src/weather/strip';
import { STALE_AFTER_HOURS as JOB_STALE } from '../../../supabase/functions/_shared/weather/config';

const NOW = Date.parse('2026-11-20T12:00:00Z');
const day = (model: string | undefined, issued: string | undefined) => parseDays([{ date: '2026-11-20', tmin: 1, tmax: 2, model, issued_at: issued }]);
describe('where the weather comes from, and how old it is', () => {
  it('the stale limit is the job\'s (12 hours) and MET Norway is shown under its licence name', () => { expect(STALE_AFTER_HOURS).toBe(JOB_STALE); expect(SOURCE_NAME.metno).toBe('MET Norway (CC BY 4.0)'); });
  it('names the source and the NEWEST issue time of all parcels; fresh within 12 hours, stale after', () => {
    const p = provenance([day('metno', '2026-11-20T03:00:00Z'), day('metno', '2026-11-20T01:00:00Z')], NOW)!;
    expect(p).toEqual({ names: ['MET Norway (CC BY 4.0)'], issued: '2026-11-20T03:00:00.000Z', stale: false });
    expect(provenance([day('metno', '2026-11-19T23:59:00Z')], NOW)!.stale).toBe(true);
    expect(provenance([day('metno', '2026-11-20T00:00:00Z')], NOW)!.stale).toBe(false);          // exactly 12 hours: not yet stale
  });
  it('without a time the data counts as stale; an unknown source is shown by its id; no stored source (the demo data) shows nothing', () => {
    expect(provenance([day('metno', undefined)], NOW)).toMatchObject({ issued: undefined, stale: true });
    expect(provenance([day('other_model', '2026-11-20T11:00:00Z')], NOW)!.names).toEqual(['other_model']);
    expect(provenance([day(undefined, undefined)], NOW)).toBeUndefined();
  });
  it('the farm_weather rows (0029) carry the model and the issue time through parseDays', () => { expect(readFileSync(new URL('../../../supabase/migrations/0029_weather_read.sql', import.meta.url), 'utf8')).toContain("'model', d.model"); });
});
