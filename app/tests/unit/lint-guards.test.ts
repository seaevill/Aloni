import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';

// Each safety ban must be provably RED on a seeded violation and GREEN on clean code.
const root = fileURLToPath(new URL('../../../', import.meta.url));
const eslint = new ESLint({ cwd: root, ignore: false });

async function lint(rel: string) {
  const [r] = await eslint.lintFiles([`app/tests/fixtures/lint/${rel}`]);
  return r.messages.filter((m) => m.severity === 2);
}

describe('ESLint guards (seeded violations)', () => {
  it('dose code: bans Math.round/floor/ceil, toFixed, numeric ?? and ||', async () => {
    const m = await lint('dose/rounds.ts');
    expect(m.map((x) => x.line)).toEqual([1, 2, 2, 3, 4, 5]);
  });
  it('dose code: clean code passes', async () => {
    expect(await lint('dose/clean.ts')).toEqual([]);
  });
  it('rules-core: bans clock and randomness, allows new Date(input)', async () => {
    const m = await lint('rules-core/clock.ts');
    expect(m.map((x) => x.line)).toEqual([1, 2, 3]);
  });
  it('ui: bans hard-coded text, allows aria-current="page"', async () => {
    const m = await lint('ui/literals.tsx');
    expect(m.map((x) => x.line)).toEqual([1, 2, 2, 3, 3]);
  });
  it('floating promises are errors', async () => {
    const m = await lint('promise.ts');
    expect(m.map((x) => x.ruleId)).toEqual(['@typescript-eslint/no-floating-promises']);
  });
});
