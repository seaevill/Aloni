import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Guard (evaluation 2026-11-28, ENV-2): an undefined var(--x) silently becomes "unset" in the browser.
// `--sp-3` was never defined and zeroed the gap between eight cards. Every custom property that is read
// must be declared somewhere in src (tokens.css, a scoped rule, or an inline style).
const SRC = new URL('../../src/', import.meta.url).pathname;

function files(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) files(p, out);
    else if (/\.(css|tsx?)$/.test(e.name)) out.push(p);
  }
  return out;
}

function undefinedVars(sources: Record<string, string>): string[] {
  const declared = new Set<string>();
  for (const text of Object.values(sources)) for (const m of text.matchAll(/(--[\w-]+)\s*:/g)) declared.add(m[1] ?? '');
  const missing: string[] = [];
  for (const [name, text] of Object.entries(sources)) {
    for (const m of text.matchAll(/var\(\s*(--[\w-]+)/g)) {
      const v = m[1] ?? '';
      if (!declared.has(v)) missing.push(`${name}: ${v}`);
    }
  }
  return missing;
}

describe('CSS custom properties', () => {
  it('every var(--x) read in src is declared somewhere', () => {
    const sources: Record<string, string> = {};
    for (const f of files(SRC)) sources[f.slice(SRC.length)] = readFileSync(f, 'utf8');
    expect(Object.keys(sources).length).toBeGreaterThan(20);
    expect(undefinedVars(sources)).toEqual([]);
  });

  it('escape attempt: the checker does catch an undefined property, with or without a fallback', () => {
    const bad = { 'a.css': '.x { margin-block: var(--sp-3); gap: var(--nope, 4px); } :root { --sp-2: 2px; }' };
    expect(undefinedVars(bad)).toEqual(['a.css: --sp-3', 'a.css: --nope']);
    expect(undefinedVars({ 'a.css': ':root { --sp-3: 3px; } .x { margin: var(--sp-3); }' })).toEqual([]);
  });
});
