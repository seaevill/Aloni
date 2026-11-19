import type { Row } from '../db/schema';
import { effectiveSprays } from '../spray/spray';

// The spray register for an inspection: one line per spray × planting, in time order, with the fields a record of plant-protection-product use needs
// (date and time, field, crop, treated area, product and registration number, dose and unit, quantity used, water, who applied, the label state and the
// waiting periods). It is a DRAFT («προσχέδιο»): the app prepares it, a person signs it. Values are printed exactly as stored; nothing is rounded.

export const COLUMNS = ['start', 'when', 'parcel', 'crop', 'area', 'product', 'reg_no', 'dose', 'unit', 'qty', 'lot', 'water', 'applicator', 'label', 'phi_until', 'rei_until', 'flags', 'note', 'late_reason', 'record', 'amends'] as const;
export type Column = (typeof COLUMNS)[number];
export type RegisterLine = Record<Column, string>;
export interface RegisterData { sprays: readonly Row[]; links: readonly Row[]; plantings: readonly Row[]; parcels: readonly Row[]; crops: readonly Row[]; products: readonly Row[]; workers: readonly Row[]; lots?: readonly Row[] }
export interface Fmt { when: (iso: string) => string; num: (s: string) => string; name: (row: Row) => string; flag: (f: string) => string; label: (state: string) => string; unit: (u: string) => string }

const text = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');

export function registerLines(d: RegisterData, f: Fmt): RegisterLine[] {
  const lines: RegisterLine[] = [];
  const sorted = effectiveSprays(d.sprays).sort((a, b) => text(a.sprayed_at).localeCompare(text(b.sprayed_at)));
  for (const s of sorted) {
    const product = d.products.find((p) => p.id === s.product_id);
    const worker = d.workers.find((w) => w.id === s.applicator_id);
    const mine = d.links.filter((l) => l.job_id === s.job_id);
    for (const l of mine.length ? mine : [undefined]) {
      const pl = d.plantings.find((p) => p.id === l?.planting_id);
      const parcel = d.parcels.find((p) => p.id === pl?.parcel_id);
      const crop = d.crops.find((c) => c.id === pl?.crop_id);
      const lot = (d.lots ?? []).filter((x) => x.lot_key === s.lot_key && typeof x.batch === 'string').pop();
      lines.push({
        start: s.started_at ? f.when(text(s.started_at)) : '', lot: lot ? text(lot.batch) : '', when: f.when(text(s.sprayed_at)), parcel: parcel ? text(parcel.name) : '', crop: crop ? f.name(crop) : '', area: l ? f.num(text(l.area_str_treated)) : '',
        product: product ? f.name(product) : '', reg_no: text(product?.reg_no), dose: f.num(text(s.dose_str)), unit: f.unit(text(s.dose_unit)), qty: f.num(text(s.qty_str)), water: f.num(text(s.water_l)),
        applicator: text(worker?.name), label: f.label(text(s.label_state)),
        phi_until: s.phi_until ? f.when(text(s.phi_until)) : '', rei_until: s.rei_until ? f.when(text(s.rei_until)) : '',
        flags: (Array.isArray(s.flags) ? (s.flags as string[]) : []).map(f.flag).join(' | '), note: text(s.note), late_reason: text(s.late_reason), record: text(s.id), amends: text(s.amends_id),
      });
    }
  }
  return lines;
}

const cell = (v: string): string => (/[";\n\r]/.test(v) ? `"${v.split('"').join('""')}"` : v);
/** Excel-friendly CSV, first row = the DRAFT notice (semicolon, UTF-8 with a BOM, «"» doubled). A cell that starts with = + - @ gets a quote so it cannot run as a formula. */
export function toCsv(draft: string, head: readonly string[], lines: readonly RegisterLine[]): string {
  const safe = (v: string) => (/^[=+@]/.test(v) || (v.startsWith('-') && !/^-?\d/.test(v)) ? `'${v}` : v);
  return `﻿${[[draft], head, ...lines.map((l) => COLUMNS.map((c) => l[c]))].map((r) => r.map((v) => cell(safe(v))).join(';')).join('\r\n')}\r\n`;
}
