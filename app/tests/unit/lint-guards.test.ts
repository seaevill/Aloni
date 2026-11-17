import { ESLint } from 'eslint';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ALL_BANS } from '../../../eslint/bans.js';

// Every ban must be provably RED on seeded violations (lines marked `@red <id>`) and GREEN on legitimate code
// (lines marked `@ok`); a flagged line without a `@red` marker is also a failure (no accidental over-banning).
// Fixtures live in app/tests/fixtures/lint/** (any subfolder, incl. redteam/). A new ban without a fixture fails the last test.
const root = fileURLToPath(new URL('../../../', import.meta.url));
const FIXTURES = join(root, 'app/tests/fixtures/lint');
const MAX_KNOWN_LIMITS = 60; // raising this needs a DECISIONS.md line
const eslint = new ESLint({ cwd: root, ignore: false });

const files = (readdirSync(FIXTURES, { recursive: true }) as string[])
  .filter((f) => /\.(ts|tsx)$/.test(f))
  .map((f) => join(FIXTURES, f))
  .sort();

interface Seen { line: number; id: string }
const seenByFile = new Map<string, Seen[]>();
const seenIds = new Set<string>();
let knownLimits = 0;

describe('ESLint safety bans (seeded violations)', () => {
  it('has fixtures', () => expect(files.length).toBeGreaterThanOrEqual(5));

  for (const file of files) {
    const rel = relative(root, file);
    it(rel, async () => {
      const [res] = await eslint.lintFiles([rel]);
      const fatal = res.messages.filter((m) => m.fatal);
      expect(fatal.map((m) => m.message), `${rel} must parse`).toEqual([]);
      const errors = res.messages.filter((m) => m.severity === 2);
      const seen: Seen[] = errors.map((m) => ({ line: m.line, id: /\[([A-Z]\d+)\]/.exec(m.message)?.[1] ?? m.ruleId ?? '?' }));
      seenByFile.set(rel, seen);
      for (const s of seen) seenIds.add(s.id);

      const lines = readFileSync(file, 'utf8').split('\n');
      const problems: string[] = [];
      let limits = 0;
      lines.forEach((text, i) => {
        const n = i + 1;
        if (/@limit/.test(text)) { limits++; return; } // documented known limit: lint cannot see it (CODING_STANDARDS.md)
        const red = /@red\s+(\S+)/.exec(text)?.[1];
        const flagged = seen.filter((s) => s.line === n).map((s) => s.id);
        if (red && !flagged.includes(red)) problems.push(`line ${n}: expected ${red}, got [${flagged.join(',')}]  ${text.trim()}`);
        if (!red && flagged.length) problems.push(`line ${n}: unexpected ${flagged.join(',')}  ${text.trim()}`);
        if (/@ok/.test(text) && flagged.length) problems.push(`line ${n}: @ok line was flagged ${flagged.join(',')}`);
      });
      expect(problems).toEqual([]);
      knownLimits += limits;
    });
  }

  it('known limits are counted, not hidden', () => {
    // lines tagged @limit are escapes we could not (or chose not to) close; they are listed in CODING_STANDARDS.md
    expect(knownLimits).toBeLessThanOrEqual(MAX_KNOWN_LIMITS);
  });

  it('every ban id is proven red by at least one fixture (a new ban without a fixture cannot be merged)', () => {
    const missing = ALL_BANS.map((b) => b.id).filter((id) => !seenIds.has(id));
    expect(missing).toEqual([]);
    expect(seenIds.has('@typescript-eslint/no-floating-promises')).toBe(true);
  });
});
