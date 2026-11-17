import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The golden rule cases are Demo-farm TEST data: the app must never import or ship them.
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
describe('golden fixtures stay out of the app', () => {
  it('no file under app/src mentions rules-core fixtures', () => {
    const hits = walk(new URL('../../src', import.meta.url).pathname).filter((f) => /\.(ts|tsx|json|css)$/.test(f) && /fixtures\/golden|golden\/.+\.json/.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
  it('the app bundle config does not copy them either', () => {
    expect(readFileSync(new URL('../../vite.config.ts', import.meta.url), 'utf8')).not.toMatch(/fixtures\/golden/);
  });
});
