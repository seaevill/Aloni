import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Merge-conflict markers must never reach main (T1, 2026-11-19: stray «=======» and «>>>>>>>» lines were found in docs/DECISIONS.md). Every tracked text file is scanned.
export const MARKER = /^(<<<<<<<|=======|>>>>>>>)( |$)/m;
export const hasMarker = (text: string): boolean => MARKER.test(text);

describe('no merge-conflict markers', () => {
  it('the detector finds each kind of marker line (and not a table separator or a line in the middle of a text)', () => {
    expect(hasMarker('a\n<<<<<<< HEAD\nb')).toBe(true);
    expect(hasMarker('a\n=======\nb')).toBe(true);
    expect(hasMarker('a\n>>>>>>> 1ce41f9 (message)\nb')).toBe(true);
    expect(hasMarker('| a | b |\n|---|---|\nx ======= y\n')).toBe(false);
    expect(hasMarker('Setext heading\n=======\n'.replace('=======', '-------'))).toBe(false);
  });
  it('no tracked *.md, *.ts, *.tsx, *.json, *.sql file holds one', () => {
    const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
    const files = execFileSync('git', ['ls-files', '*.md', '*.ts', '*.tsx', '*.json', '*.sql'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
    expect(files.length).toBeGreaterThan(100);
    const bad = files.filter((f) => !f.includes('/fixtures/') && hasMarker(readFileSync(`${root}/${f}`, 'utf8')));
    expect(bad).toEqual([]);
  });
});
