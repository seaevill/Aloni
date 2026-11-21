// «Για έλεγχο»: what a worker saw in the field, waiting for the owner to look. The app shows it; it never names a disease and never decides.
import type { Row } from '../db/schema';

export const REVIEWED_KEY = 'observations_reviewed';
export const PENDING_MAX = 20;

/** Observations nobody has looked at yet, newest first (at most PENDING_MAX). Deleted rows and the ones already seen are left out. */
export function pendingObservations(rows: readonly Row[], reviewed: readonly string[]): Row[] {
  return rows
    .filter((r) => !r.deleted_at && !reviewed.includes(String(r.id)))
    .sort((a, b) => String(b.observed_at).localeCompare(String(a.observed_at)))
    .slice(0, PENDING_MAX);
}

/** The plantings of one parcel (live ones), to preselect in the job form. Nothing else is ever preselected: product, dose and worker stay the owner's choice. */
export function jobParcelPicks(plantings: readonly Row[], parcelId: string): string[] {
  return plantings.filter((p) => !p.deleted_at && p.parcel_id === parcelId).map((p) => String(p.id));
}
