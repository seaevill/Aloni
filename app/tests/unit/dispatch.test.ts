import { describe, expect, it } from 'vitest';
import { copyText, dispatchDay, dispatchText, fractionText } from '../../src/orders/dispatch';
import { parseBackup } from '../../src/orders/klouves';
import { lang, tn } from '../../src/i18n';

const backup = JSON.stringify({ app: 'klouves', at: '2026-11-19', data: {
  'klv.db.cfg': { products: [{ id: 'sp', name: 'Σπανάκι' }, { id: 'ro', name: 'Ρόκα' }, { id: 'pa', name: 'Μαϊντανός' }, { id: 'kr', name: 'Κρεμμύδι' }], clients: [{ id: 'c1', name: 'Λαϊκή Νίκαιας' }, { id: 'c2', name: 'Μανάβικο Νίκος' }] },
  'klv.db.day.2026-11-20': { orders: { c1: { sp: 6, ro: 4.5 }, c2: { sp: 3, pa: 2, kr: 0.5 } } },
} });

describe('T10 dispatch', () => {
  it('the copy text is exactly the agreed Greek text', () => {
    lang.value = 'el';
    const p = parseBackup(backup);
    if (!p.ok) throw new Error('parse');
    const clients = dispatchDay(p.orders, {}, '2026-11-20');
    const text = dispatchText(clients, { header: 'Παρασκευή 20/11 – αποστολή', total: (q, n) => tn('dispatch.total', n, { q }) });
    expect(text).toBe('Παρασκευή 20/11 – αποστολή\nΛαϊκή Νίκαιας: Σπανάκι 6 · Ρόκα 4½\nΜανάβικο Νίκος: Σπανάκι 3 · Μαϊντανός 2 · Κρεμμύδι ½\n= 16 κλούβες');
  });
  it('quarters read ¼ ½ ¾ and whole numbers stay whole', () => {
    expect([0.25, 0.5, 0.75, 1, 4.5, 12.25, 3].map(fractionText)).toEqual(['¼', '½', '¾', '1', '4½', '12¼', '3']);
  });
  it('plural: 1 κλούβα, 2 κλούβες', () => {
    lang.value = 'el';
    expect(tn('dispatch.total', 1, { q: '1' })).toBe('= 1 κλούβα');
    expect(tn('dispatch.total', 2, { q: '2' })).toBe('= 2 κλούβες');
  });
  it('an unknown day has no clients; an old import without days has none either', () => {
    const p = parseBackup(backup);
    if (!p.ok) throw new Error('parse');
    expect(dispatchDay(p.orders, {}, '2026-11-21')).toEqual([]);
    expect(dispatchDay({ products: [], weeks: {}, skipped: 0 }, {}, '2026-11-20')).toEqual([]);
  });
  it('share → clipboard → manual', async () => {
    expect(await copyText('x', { share: async () => undefined })).toBe('shared');
    expect(await copyText('x', { share: async () => { throw new Error('no'); }, clipboard: { writeText: async () => undefined } })).toBe('copied');
    expect(await copyText('x', {})).toBe('manual');
    expect(await copyText('x', { share: async () => { const e = new Error('c'); e.name = 'AbortError'; throw e; }, clipboard: { writeText: async () => undefined } })).toBe('cancelled');
  });
});
