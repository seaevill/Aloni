import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import hi from '../../src/i18n/hi.json';
import el from '../../src/i18n/el.json';

// T12: everything a worker can reach has a Hindi text (no Greek fallback on the worker's own screens).
const FILES = ['src/ui/WorkerApp.tsx', 'src/ui/HarvestForm.tsx', 'src/ui/useSubmit.ts', 'src/worker/held.ts'];
const keysIn = (file: string): string[] => [...readFileSync(file, 'utf8').matchAll(/\b(?:t|ts|tn)\(\s*'([a-z0-9_.]+)'/g)].map((m) => m[1]);
const constKeys = (file: string): string[] => [...readFileSync(file, 'utf8').matchAll(/'((?:worker|harvest|spray|labeluse|unit|obs|observe|skip|job|queue|sync|value|product)\.[a-z0-9_.]+)'/g)].map((m) => m[1]);

describe('Hindi coverage of the worker screens', () => {
  it('every key used by the worker components exists in hi.json', () => {
    const used = new Set(FILES.flatMap((f) => [...keysIn(f), ...constKeys(f)]).flatMap((k) => (k in el ? [k] : [`${k}.one`, `${k}.other`].filter((x) => x in el))));
    const missing = [...used].filter((k) => !(k in hi));
    expect(missing).toEqual([]);
  });
  it('the worker group of keys is complete in hi.json', () => {
    const workerKeys = Object.keys(el).filter((k) => k.startsWith('worker.'));
    expect(workerKeys.filter((k) => !(k in hi))).toEqual([]);
  });
  it('src folder sanity: the worker files exist', () => {
    expect(readdirSync('src/ui')).toContain('WorkerApp.tsx');
  });
});

import { CATALOG, cropName } from '../../src/crops/catalog';
import { lang } from '../../src/i18n';
import { formatDose } from '../../src/i18n/format';
import { known } from '@aloni/rules-core';

describe('Hindi crop names and doses', () => {
  it('every catalog crop has a Hindi name; the worker sees it beside the Greek one', () => {
    for (const c of CATALOG) expect(c.hi.length).toBeGreaterThan(0);
    expect(cropName(CATALOG[0], 'hi')).toBe('पालक · Σπανάκι');
  });
  it('a dose is printed with the Greek decimal comma in Hindi too (0,2, never rounded)', () => {
    lang.value = 'hi';
    expect(formatDose(known('0.2' as never))).toBe('0,2');
    expect(formatDose(known('0.250' as never))).toBe('0,250');
    lang.value = 'el';
  });
});
