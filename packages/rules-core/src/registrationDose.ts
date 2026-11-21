import { compareDecimal, mulDecimal, type Decimal } from './decimal';
import type { Output, Snapshot } from './engine';
import type { DoseUnit } from './label';

export interface DoseCheck {
  jobId: string;
  target: string | null;
  dose?: Decimal;
  unit?: DoseUnit;
  treatedAreaStr?: Decimal;
}

type DoseOutput = Pick<Output, 'kind' | 'category' | 'values' | 'vetoes'> & Partial<Pick<Output, 'product_ids' | 'planting_ids' | 'severity'>>;

export function registrationDose(s: Snapshot, checks: readonly DoseCheck[]): DoseOutput[] {
  const labels: Record<string, Decimal> = {};
  const doses: Record<string, Decimal> = {};
  const totals: Record<string, Decimal> = {};
  const inRange: Record<string, boolean | null> = {};
  const blocks: DoseOutput[] = [];
  for (const use of s.uses) {
    if (use.target === null && use.signed.known && use.signed.value.dose.kind === 'single') {
      labels[`${use.productId}/${use.cropId}`] = use.signed.value.dose.min;
    }
  }

  for (const check of checks) {
    const draft = s.draftJobs.find((j) => j.id === check.jobId && j.kind === 'spray');
    const job = draft ?? s.jobs.find((j) => j.id === check.jobId && j.kind === 'spray' && j.status === 'done');
    if (!job) continue;
    const { dose, unit, treatedAreaStr } = check;
    if (dose !== undefined) doses[job.id] = dose;
    if (dose !== undefined && treatedAreaStr !== undefined && (unit === 'l/str' || unit === 'ml/str' || unit === 'kg/str' || unit === 'g/str')) {
      totals[job.id] = mulDecimal(dose, treatedAreaStr);
    }
    const comparisons = job.plantingIds.map((id) => {
      const p = s.plantings.find((planting) => planting.id === id);
      const uses = s.uses.filter((use) => use.productId === job.productId && use.cropId === p?.cropId && use.target === check.target);
      const label = uses[0]?.signed;
      // A missing or ambiguous label cannot clear the draft.
      if (uses.length !== 1 || !label?.known || dose === undefined || label.value.dose.unit !== unit) return 'unknown';
      if (compareDecimal(dose, label.value.dose.min) < 0) return 'dose_below_label_min';
      if (compareDecimal(dose, label.value.dose.max) > 0) return 'dose_above_label_max';
      return 'in_range';
    });
    const outside = comparisons.find((value) => value === 'dose_below_label_min' || value === 'dose_above_label_max');
    const allKnown = comparisons.length > 0 && !comparisons.includes('unknown');
    inRange[job.id] = outside ? false : allKnown ? true : null;
    if (draft && inRange[job.id] !== true) {
      const reason = outside ?? 'dose_unknown';
      blocks.push({
        kind: 'block', category: outside ? 'dose_outside_label' : 'dose_check_unknown', severity: 'high',
        planting_ids: [...job.plantingIds], product_ids: [job.productId], values: { job_id: job.id },
        vetoes: [{ by: 'REG', vetoed: 'spray', job_id: job.id, reason }],
      });
    }
  }
  return [{
    kind: 'check', category: 'label_dose', vetoes: [],
    values: {
      label_dose_per_str: labels,
      label_dose_el: Object.fromEntries(Object.entries(labels).map(([key, value]) => [key, value.replace('.', ',')])),
      job_dose: doses, total_qty: totals, dose_in_range: inRange,
    },
  }, ...blocks];
}
