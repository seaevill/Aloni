// Probe helpers (review only; fictional Demo-style data, TEST-ONLY label values - never label data).
import { fingerprint, known, makeDose, parseDecimal, parseMaxApps, parsePhiDays, parseReiHours, requireSignOff, type LabelUse, type Snapshot, type UseFact } from '/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/Aloni/packages/rules-core/src/index';
export const SRC = '/tmp/claude-0/-home-user-aloni/12a47fa6-139c-5f71-a98a-0df4dbd0866e/scratchpad/eval/Aloni/packages/rules-core/src';

export function signedUse(productId: string, cropId: string, phi: string, rei: string, extra: Partial<UseFact> = {}, dose = '0.06'): UseFact {
  const use: LabelUse = { scope: `${productId}/${cropId}/${extra.target ?? ''}`, dose: makeDose(known('single'), known('l/str'), parseDecimal(dose), parseDecimal('')), phiDays: parsePhiDays(phi), reiHours: parseReiHours(rei), maxApps: parseMaxApps('2') };
  return { productId, cropId, target: null, maxApps: 2, minIntervalDays: 7, signed: requireSignOff(use, { by: 'agronomist (test)', on: '2026-11-01', fingerprint: fingerprint(use) }), ...extra };
}

export function snap(over: Partial<Snapshot> = {}): Snapshot {
  return {
    asOf: '2026-11-20T10:00:00Z', plantings: [{ id: 'PL1', parcelId: 'P1', cropId: 'spinach' }], jobs: [], uses: [], tasks: [],
    ruleStatus: {}, parcelsForInfo: [], draftJobs: [], products: [], ...over,
  };
}
export const spray = (id: string, plantingIds: string[], productId: string, startedAt: string, endedAt: string | undefined, status = 'done') =>
  ({ id, kind: 'spray', status, plantingIds, productId, startedAt, endedAt });
