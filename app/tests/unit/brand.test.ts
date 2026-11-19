import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// T16: one name, one place; the install manifest has an id and its own maskable icon.
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

describe('brand', () => {
  it('«Αλώνι» appears in app/src code only in config.ts (the i18n files may speak about it)', () => {
    const hits = walk('src').filter((f) => /\.(ts|tsx)$/.test(f) && readFileSync(f, 'utf8').includes('Αλώνι')).map((f) => f.replaceAll('\\', '/'));
    expect(hits).toEqual(['src/config.ts']);
  });
  it('the manifest has an id and a maskable icon that is not icon-512.png', () => {
    const cfg = readFileSync('vite.config.ts', 'utf8');
    expect(cfg).toMatch(/id: '\/'/);
    const maskable = /\{ src: '([^']+)'[^}]*purpose: 'maskable'/.exec(cfg);
    expect(maskable?.[1]).toBeDefined();
    expect(maskable?.[1]).not.toBe('icon-512.png');
    expect(existsSync(join('public', maskable?.[1] ?? 'missing'))).toBe(true);
  });
  it('the page declares the standard web-app meta and a light colour scheme', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('name="mobile-web-app-capable"');
    expect(html).toContain('name="color-scheme" content="light"');
  });
});
