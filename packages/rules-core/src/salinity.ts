import { isCalendarDate, parseInstant } from './waits';

interface WaterSample {
  parcelId: string;
  sampledOn: string;
  waterEcDsM: number | undefined;
  coastalWell: boolean;
}

export interface SalinityFacts {
  /** Latest irrigation water sample per parcel. Soil ECe is a different measurement. */
  samples: readonly WaterSample[];
  sensitiveCrops: readonly string[];
  retestMonths: number | undefined;
}

export function salinityReading(sample: WaterSample, asOf: string, retestMonths: number | undefined) {
  const ec = sample.waterEcDsM;
  if (ec === undefined || !Number.isFinite(ec) || ec < 0 || retestMonths === undefined || !Number.isInteger(retestMonths) || retestMonths <= 0) return undefined;
  // Keep the supplied precision in the output. The first possible day gives a conservative age for a month-only sample.
  const earliest = /^\d{4}-\d{2}$/.test(sample.sampledOn) ? `${sample.sampledOn}-01` : sample.sampledOn;
  const today = asOf.slice(0, 10);
  if (!isCalendarDate(earliest) || !parseInstant(asOf).known || earliest > today) return undefined;
  const [year, month, day] = earliest.split('-').map(Number);
  const [thisYear, thisMonth, thisDay] = today.split('-').map(Number);
  const months = (thisYear - year) * 12 + thisMonth - month - (thisDay < day ? 1 : 0);
  // A coastal well needs a new sample after summer if the latest sample predates September.
  const autumnRetest = sample.coastalWell && earliest < `${thisMonth >= 9 ? thisYear : thisYear - 1}-09-01`;
  return {
    waterClass: ec < 0.7 ? 'none' : ec <= 3 ? 'slight_moderate' : 'severe',
    retest: months >= retestMonths || autumnRetest,
    confidence: months < 6 ? 'high' : 'low',
  } as const;
}
