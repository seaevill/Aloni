import type { Row } from '../db/schema';
import { effectiveSprays } from '../spray/spray';
import { EPPO_CODES } from './eppo';
import { areaHa, dosePerHa } from './units';
import type { RegisterData } from './register';

// The MACHINE-READABLE register (a second file next to the one a person reads) for Reg. (EU) 2023/564: fixed ENGLISH field names mapped one to one to the Annex (docs/compliance/2023-564-mapping.md),
// one header row, a decimal POINT, ISO 8601 times WITH the Athens offset, RFC 4180 comma-separated, UTF-8 without a BOM. Warnings are a SEPARATE file (one line per record × warning code), never mixed
// into the data. Values are the stored ones: nothing rounded, nothing translated. Dose and area are kept AS ENTERED (per στρέμμα) and ALSO given per hectare (exact decimal arithmetic, no rounding),
// side by side. A field the app does not hold stays EMPTY and the warnings file says «fill in» (missing_*): nothing is invented.
export const MACHINE_COLUMNS = [
  'holder_name', 'holder_vat_id', 'record_id', 'amends_record_id', 'tank_mix_id',
  'product_trade_name', 'authorisation_number',
  'application_start', 'application_end',
  'dose_as_entered', 'dose_unit_as_entered', 'dose_per_ha', 'dose_per_ha_unit',
  'treated_area_stremma', 'treated_area_ha',
  'iacs_parcel_id', 'parcel_name', 'crop_slug', 'eppo_code', 'bbch_stage', 'prescription_number',
  'applicator', 'quantity_used', 'water_l', 'label_state', 'phi_until', 'rei_until',
] as const;
export type MachineColumn = (typeof MACHINE_COLUMNS)[number];
export type MachineLine = Record<MachineColumn, string>;
export interface Holder { name: string; vatId: string }
const text = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');

/** «2026-11-20T10:00:00Z» → «2026-11-20T12:00:00+02:00» (Athens, summer and winter time). An unreadable instant stays empty: never guessed. */
export function athensIso(instant: string): string {
  const ms = Date.parse(instant);
  if (Number.isNaN(ms)) return '';
  const at = new Date(ms);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'longOffset' }).formatToParts(at);
  const p = (type: string) => parts.find((x) => x.type === type)?.value ?? '';
  const offset = p('timeZoneName').replace('GMT', '') || '+00:00';
  return `${p('year')}-${p('month')}-${p('day')}T${p('hour')}:${p('minute')}:${p('second')}${offset.length === 3 ? `${offset}:00` : offset}`;
}

export function machineLines(d: RegisterData, holder: Holder): MachineLine[] {
  const out: MachineLine[] = [];
  for (const s of effectiveSprays(d.sprays).sort((a, b) => text(a.sprayed_at).localeCompare(text(b.sprayed_at)))) {
    const mine = d.links.filter((l) => l.job_id === s.job_id);
    for (const l of mine.length ? mine : [undefined]) {
      const pl = d.plantings.find((p) => p.id === l?.planting_id);
      const name = (r: Row | undefined) => text(r?.name ?? r?.name_en ?? r?.label ?? '');
      const prod = d.products.find((p) => p.id === s.product_id);
      const crop = d.crops.find((c) => c.id === pl?.crop_id);
      const ha = dosePerHa(text(s.dose_str), text(s.dose_unit));
      const area = l ? text(l.area_str_treated) : '';
      out.push({
        holder_name: holder.name, holder_vat_id: holder.vatId, record_id: text(s.id), amends_record_id: text(s.amends_id), tank_mix_id: text(s.mix_id),
        product_trade_name: name(prod), authorisation_number: text(prod?.reg_no),
        application_start: s.started_at ? athensIso(text(s.started_at)) : '', application_end: athensIso(text(s.sprayed_at)),
        dose_as_entered: text(s.dose_str), dose_unit_as_entered: text(s.dose_unit), dose_per_ha: ha?.amount ?? '', dose_per_ha_unit: ha?.unit ?? '',
        treated_area_stremma: area, treated_area_ha: areaHa(area) ?? '',
        iacs_parcel_id: text(d.parcels.find((p) => p.id === pl?.parcel_id)?.opekepe_code), parcel_name: name(d.parcels.find((p) => p.id === pl?.parcel_id)),
        crop_slug: text(crop?.slug), eppo_code: EPPO_CODES[text(crop?.slug)] ?? '', bbch_stage: text(s.bbch), prescription_number: text(s.prescription_no),
        applicator: text(d.workers.find((w) => w.id === s.applicator_id)?.name), quantity_used: text(s.qty_str), water_l: text(s.water_l),
        label_state: text(s.label_state), phi_until: s.phi_until ? athensIso(text(s.phi_until)) : '', rei_until: s.rei_until ? athensIso(text(s.rei_until)) : '',
      });
    }
  }
  return out;
}

/** What a person must still fill in, per record: a field the Annex asks for that the app does not hold (empty in the machine file). */
export const FILL_IN = ['missing_product_name', 'missing_treated_area', 'missing_authorisation_number', 'missing_start_time', 'missing_iacs_parcel_id', 'missing_eppo_code', 'missing_bbch_stage', 'dose_not_per_area'] as const;
export type FillIn = (typeof FILL_IN)[number];
export function fillInOf(line: MachineLine): FillIn[] {
  const out: FillIn[] = [];
  if (!line.product_trade_name) out.push('missing_product_name');
  if (!line.treated_area_ha) out.push('missing_treated_area');
  if (!line.authorisation_number) out.push('missing_authorisation_number');
  if (!line.application_start) out.push('missing_start_time');
  if (!line.iacs_parcel_id) out.push('missing_iacs_parcel_id');
  if (!line.eppo_code) out.push('missing_eppo_code');
  if (!line.bbch_stage) out.push('missing_bbch_stage');
  if (!line.dose_per_ha) out.push('dose_not_per_area');
  return out;
}

/** The warnings, one line per spray record and code: the app's own flags (label_unsigned, dose_outside_label, max_apps_exceeded, late_entry, ...) AND the «fill in» codes (missing_*). */
export function warningLines(d: RegisterData): Array<{ record_id: string; warning_code: string }> {
  const flags = effectiveSprays(d.sprays).flatMap((s) => (Array.isArray(s.flags) ? (s.flags as unknown[]) : []).filter((f): f is string => typeof f === 'string').map((f) => ({ record_id: text(s.id), warning_code: f })));
  const seen = new Set<string>();
  const fill = machineLines(d, { name: '', vatId: '' }).flatMap((l) => fillInOf(l).map((code) => ({ record_id: l.record_id, warning_code: code }))).filter((w) => { const k = `${w.record_id}|${w.warning_code}`; if (seen.has(k)) return false; seen.add(k); return true; });
  return [...flags, ...fill];
}

const cell = (v: string): string => (/[",\r\n]/.test(v) ? `"${v.split('"').join('""')}"` : v);
/** RFC 4180: comma, CRLF, a header row; no spreadsheet-formula guarding here (a machine reads it; the human file keeps its guard). */
export function toMachineCsv(head: readonly string[], rows: ReadonlyArray<readonly string[]>): string {
  return `${[head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')}\r\n`;
}

/** The same lines and warnings as the CSV files, as one machine-readable JSON document. Nothing is added or computed here beyond what the CSV holds. */
export function toMachineJson(d: RegisterData, holder: Holder, generatedAt: string): string {
  return `${JSON.stringify({ regulation: 'Regulation (EU) 2023/564', format_version: 1, generated_at: generatedAt, holder: { name: holder.name, vat_id: holder.vatId }, records: machineLines(d, holder), warnings: warningLines(d) }, undefined, 2)}\n`;
}
