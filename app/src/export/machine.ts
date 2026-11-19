import type { Row } from '../db/schema';
import { effectiveSprays } from '../spray/spray';
import type { RegisterData } from './register';

// The MACHINE-READABLE register (a second file next to the one a person reads): fixed ENGLISH field names, one header row, a decimal POINT, ISO 8601 times WITH the Athens offset,
// RFC 4180 comma-separated, UTF-8 without a BOM. Warnings are a SEPARATE file (one line per record × warning code), never mixed into the data. Values are the stored ones: nothing rounded,
// nothing translated. NOT in this file because the app does not hold them yet: ΟΣΔΕ/IACS parcel id, EPPO crop code, BBCH stage, start time of the spraying, prescription number.
export const MACHINE_COLUMNS = ['holder_name', 'holder_vat_id', 'record_id', 'amends_record_id', 'applied_end', 'parcel', 'crop', 'treated_area_str', 'product', 'registration_number', 'dose', 'dose_unit', 'quantity_used', 'water_l', 'applicator', 'label_state', 'phi_until', 'rei_until'] as const;
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
      out.push({
        holder_name: holder.name, holder_vat_id: holder.vatId, record_id: text(s.id), amends_record_id: text(s.amends_id), applied_end: athensIso(text(s.sprayed_at)),
        parcel: name(d.parcels.find((p) => p.id === pl?.parcel_id)), crop: text(d.crops.find((c) => c.id === pl?.crop_id)?.slug), treated_area_str: l ? text(l.area_str_treated) : '',
        product: name(d.products.find((p) => p.id === s.product_id)), registration_number: text(d.products.find((p) => p.id === s.product_id)?.reg_no),
        dose: text(s.dose_str), dose_unit: text(s.dose_unit), quantity_used: text(s.qty_str), water_l: text(s.water_l),
        applicator: text(d.workers.find((w) => w.id === s.applicator_id)?.name), label_state: text(s.label_state), phi_until: s.phi_until ? athensIso(text(s.phi_until)) : '', rei_until: s.rei_until ? athensIso(text(s.rei_until)) : '',
      });
    }
  }
  return out;
}

/** The warnings, one line per spray record and flag code (the codes are the app's own: label_unsigned, dose_outside_label, max_apps_exceeded, late_entry, ...). */
export function warningLines(d: RegisterData): Array<{ record_id: string; warning_code: string }> {
  return effectiveSprays(d.sprays).flatMap((s) => (Array.isArray(s.flags) ? (s.flags as unknown[]) : []).filter((f): f is string => typeof f === 'string').map((f) => ({ record_id: text(s.id), warning_code: f })));
}

const cell = (v: string): string => (/[",\r\n]/.test(v) ? `"${v.split('"').join('""')}"` : v);
/** RFC 4180: comma, CRLF, a header row; no spreadsheet-formula guarding here (a machine reads it; the human file keeps its guard). */
export function toMachineCsv(head: readonly string[], rows: ReadonlyArray<readonly string[]>): string {
  return `${[head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')}\r\n`;
}
