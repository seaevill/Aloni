import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COLUMNS, registerLines, toCsv, type Fmt, type RegisterData } from '../../src/export/register';
import { importDemo, type PrototypeData } from '../../src/db/import-demo';
import { newDb } from '../helpers/factories';
import type { Row } from '../../src/db/schema';

const demo = JSON.parse(readFileSync(new URL('../../../reference/prototype/data.json', import.meta.url), 'utf8')) as PrototypeData;
const fmt: Fmt = { when: (s) => s, num: (s) => s.split('.').join(','), name: (r) => String(r.name ?? r.name_el ?? ''), flag: (f) => f, label: (s) => s, unit: (u) => u };
const base = (over: Partial<RegisterData> = {}): RegisterData => ({
  sprays: [{ id: 's1', farm_id: 'f', job_id: 'j1', product_id: 'pr', applicator_id: 'w', sprayed_at: '2026-11-20T08:00:00Z', dose_str: '0.025', dose_unit: 'ml/str', qty_str: '0.250', label_state: 'signed', phi_until: '2026-11-27T08:00:00Z', flags: ['lot_expired'], note: 'a;b "c"' }],
  links: [{ id: 'l1', farm_id: 'f', job_id: 'j1', planting_id: 'pl', area_str_treated: '0.5' }, { id: 'l2', farm_id: 'f', job_id: 'j1', planting_id: 'pl2', area_str_treated: '1' }],
  plantings: [{ id: 'pl', farm_id: 'f', crop_id: 'c', parcel_id: 'p' }, { id: 'pl2', farm_id: 'f', crop_id: 'c', parcel_id: 'p' }], parcels: [{ id: 'p', farm_id: 'f', name: 'Κάτω Κάμπος' }],
  crops: [{ id: 'c', farm_id: 'f', name_el: 'Σπανάκι' }], products: [{ id: 'pr', farm_id: 'f', name: 'Kocide', reg_no: '1234/56' }], workers: [{ id: 'w', farm_id: 'f', name: 'Γιώργος' }], ...over,
});

describe('the spray register', () => {
  it('one line per spray × planting with the inspection fields, values exactly as stored (0.250 keeps its zero), the applicator and the waiting end', () => {
    const lines = registerLines(base(), fmt);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toEqual({ "start": "", "lot": "", "amends": "", "applicator": "Γιώργος", "area": "0,5", "crop": "Σπανάκι", "dose": "0,025", "flags": "lot_expired", "label": "signed", "late_reason": "", "note": 'a;b "c"', "parcel": "Κάτω Κάμπος", "phi_until": "2026-11-27T08:00:00Z", "product": "Kocide", "qty": "0,250", "record": "s1", "reg_no": "1234/56", "rei_until": "", "unit": "ml/str", "water": "", "when": "2026-11-20T08:00:00Z" });
    expect(lines[1].area).toBe('1');
  });
  it('an unknown waiting period stays EMPTY (never a made-up date); a correction replaces the row it amends and names it', () => {
    const plain = base().sprays[0];
    const unknown: Row = { ...plain, id: 's2', phi_until: undefined, label_state: 'unsigned' };
    expect(registerLines(base({ sprays: [unknown] }), fmt)[0].phi_until).toBe('');
    const amend: Row = { ...unknown, id: 's3', amends_id: 's2', phi_until: '2026-11-27T08:00:00Z' };
    const lines = registerLines(base({ sprays: [unknown, amend] }), fmt);
    expect(lines).toHaveLength(2); // the amended row is not listed twice
    expect(lines[0]).toEqual({ "start": "", "lot": "", "amends": "s2", "applicator": "Γιώργος", "area": "0,5", "crop": "Σπανάκι", "dose": "0,025", "flags": "lot_expired", "label": "unsigned", "late_reason": "", "note": 'a;b "c"', "parcel": "Κάτω Κάμπος", "phi_until": "2026-11-27T08:00:00Z", "product": "Kocide", "qty": "0,250", "record": "s3", "reg_no": "1234/56", "rei_until": "", "unit": "ml/str", "water": "", "when": "2026-11-20T08:00:00Z" });
  });
  it('a late entry is marked and its reason printed next to it', () => {
    const late: Row = { ...base().sprays[0], flags: ['late_entry'], late_reason: 'Ξέχασα' };
    const l = registerLines(base({ sprays: [late] }), fmt)[0];
    expect([l.flags, l.late_reason]).toEqual(['late_entry', 'Ξέχασα']);
    expect(COLUMNS).toContain('late_reason');
  });
  it('in time order, oldest first', () => {
    const a = { ...base().sprays[0], id: 'a', sprayed_at: '2026-11-21T08:00:00Z' }; const b = { ...base().sprays[0], id: 'b', sprayed_at: '2026-11-19T08:00:00Z' };
    expect(registerLines(base({ sprays: [a, b], links: [] }), fmt).map((l) => l.record)).toEqual(['b', 'a']);
  });
  it('CSV: draft notice first, then the header, semicolons, BOM, quotes doubled, and no cell can start a spreadsheet formula', () => {
    const lines = registerLines(base({ sprays: [{ ...base().sprays[0], note: '=HYPERLINK("x")' }, { ...base().sprays[0], id: 's9', note: 'a;b "c"' }] }), fmt);
    const csv = toCsv('ΠΡΟΣΧΕΔΙΟ', COLUMNS.map((c) => c), lines);
    expect(csv.startsWith('﻿ΠΡΟΣΧΕΔΙΟ\r\n')).toBe(true);
    const rows = csv.split('\r\n');
    expect(rows[1].split(';')).toHaveLength(COLUMNS.length);
    expect(csv).toContain("'=HYPERLINK"); // neutralised
    expect(csv).toContain('"a;b ""c"""');
  });
  it('the demo farm gives a register line for every demo spray planting', async () => {
    const db = await newDb();
    await importDemo(db, demo);
    const rows = async (t: 'job_spray' | 'job_plantings' | 'plantings' | 'parcels' | 'crops' | 'products' | 'workers') => db[t].toArray();
    const lines = registerLines({ sprays: await rows('job_spray'), links: await rows('job_plantings'), plantings: await rows('plantings'), parcels: await rows('parcels'), crops: await rows('crops'), products: await rows('products'), workers: await rows('workers') }, fmt);
    expect(lines.length).toBeGreaterThanOrEqual(7);
    for (const l of lines) { expect(l.product, l.record).not.toBe(''); expect(l.applicator).not.toBe(''); expect(l.parcel).not.toBe(''); }
  });
  it('T17: the start time and the lot (batch) get their own columns; the Greek header names them', async () => {
    const withLot = base({ sprays: [{ ...base().sprays[0], started_at: '2026-11-18T07:00:00Z', lot_key: 'k1' }], lots: [{ id: 'k1', farm_id: 'f', lot_key: 'k1', batch: 'A-77' }] });
    const [l] = registerLines(withLot, fmt);
    expect([l.start, l.lot]).toEqual([fmt.when('2026-11-18T07:00:00Z'), 'A-77']);
    const el = (await import('../../src/i18n/el.json')).default as Record<string, string>;
    const head = COLUMNS.map((c) => el[`register.col.${c}`]);
    expect(head).toEqual(expect.arrayContaining(['Έναρξη', 'Λήξη', 'Παρτίδα', 'Νερό (L)']));
  });
});
