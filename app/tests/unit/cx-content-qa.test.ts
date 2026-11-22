import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../src/content/', import.meta.url));
const sources = readFileSync(new URL('../../../docs/content/sources.md', import.meta.url), 'utf8');
const productData = JSON.parse(readFileSync(new URL('../../../reference/prototype/data.json', import.meta.url), 'utf8')) as {
  products: ReadonlyArray<{ label?: string; name_el?: string; name_en?: string; name_tr?: string; active?: string }>;
};
const normalize = (s: string) => s.toLowerCase().normalize('NFKC').replace(/\s+/gu, ' ').trim();
const products = productData.products.flatMap((p) =>
  [p.label, p.name_el, p.name_en, p.name_tr, p.active].filter((s): s is string => typeof s === 'string' && s.trim().length > 3).map(normalize));
const approvedLinks = new Set([...sources.matchAll(/\]\((https?:\/\/[^)\s]+)\)/gu)].map((m) => m[1]));
const banned = /\bsafe\b|ασφαλ[έε]ς|\bgüvenli\b|सुरक्षित/iu;
const dose = /\p{N}+(?:[.,]\p{N}+)?\s*(?:[μµu]?g|kg|mg|[μµu]?l|ml|cl|dl|gr|κιλά|γραμμάρια|λίτρα|किलो|लीटर)(?=\s|\/|$|[.,;])/iu;

const files = readdirSync(root, { recursive: true }).filter((p): p is string => typeof p === 'string' && /\.(?:ts|json)$/u.test(p));
type Dictionary = Readonly<Record<string, unknown>>;
const json = (path: string): Dictionary => JSON.parse(readFileSync(path, 'utf8')) as Dictionary;
function fields(value: unknown, path = ''): string[] {
  if (Array.isArray(value)) return value.flatMap((child, index) => fields(child, [path, index].join('.')));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, child]) => fields(child, [path, key].join('.')));
  return [path];
}

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

function sourceStrings(path: string): string[] {
  if (path.endsWith('.json')) return strings(json(path));
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  const values: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isStringLiteralLike(node) && !ts.isImportDeclaration(node.parent) && !ts.isExportDeclaration(node.parent)) values.push(node.text);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return values;
}

describe('publishable content', () => {
  it('keeps the expected locale dictionaries in key parity', () => {
    const folders = new Set(files.filter((p) => /(?:^|\/)(el|tr|en|hi)\.json$/u.test(p)).map(dirname));
    for (const folder of folders) {
      const locales = folder === 'crops' ? ['el', 'tr', 'en'] : folder === 'worker-tips' ? ['el', 'hi'] : ['el', 'tr', 'en', 'hi'];
      const present = files.filter((p) => dirname(p) === folder && /^(el|tr|en|hi)\.json$/u.test(basename(p)));
      expect(present.map((p) => basename(p, '.json')).sort(), folder).toEqual(locales.sort());
      const expected = fields(json(join(root, folder, 'el.json'))).sort();
      for (const file of present) expect(fields(json(join(root, file))).sort(), file).toEqual(expected);
    }
  });

  it('rejects advice terms, product names, quantities with dose units and unsourced links', () => {
    for (const file of files) {
      const ceiling = file.startsWith('crops/') ? 300 : 260;
      for (const value of sourceStrings(join(root, file))) {
        expect(value.length, file).toBeLessThanOrEqual(ceiling);
        expect(value, file).not.toMatch(banned);
        expect(value, file).not.toMatch(dose);
        const tidy = normalize(value);
        expect(products.find((name) => tidy.includes(name)), file).toBeUndefined();
        for (const [link] of value.matchAll(/https?:\/\/[^\s<>)]+/gu)) expect(approvedLinks.has(link), file).toBe(true);
      }
    }
  });
});
