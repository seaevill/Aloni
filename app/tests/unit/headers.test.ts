import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Parses public/_headers (Cloudflare Pages format) and checks the rules Bora asked for.
const text = readFileSync(new URL('../../public/_headers', import.meta.url), 'utf8');
const rules = new Map<string, Record<string, string>>();
let path = '';
for (const raw of text.split('\n')) {
  if (!raw.trim() || raw.startsWith('#')) continue;
  if (!raw.startsWith(' ')) { path = raw.trim(); rules.set(path, {}); continue; }
  const [k, ...v] = raw.trim().split(':');
  rules.get(path)![k.trim().toLowerCase()] = v.join(':').trim();
}

describe('_headers', () => {
  it('service worker and HTML are never cached', () => {
    for (const p of ['/sw.js', '/index.html', '/']) expect(rules.get(p)?.['cache-control'], p).toMatch(/no-cache|no-store/);
  });
  it('hashed assets are cached for a long time', () => {
    expect(rules.get('/assets/*')?.['cache-control']).toBe('public, max-age=31536000, immutable');
  });
  it('the site-wide rule sets no Cache-Control (only the specific rules do)', () => {
    expect(rules.get('/*')?.['cache-control']).toBeUndefined();
  });
  it('CSP is strict: self only, no inline or eval, no framing, no plugins', () => {
    const csp = rules.get('/*')?.['content-security-policy'] ?? '';
    for (const d of ["default-src 'self'", "script-src 'self'", "style-src 'self'", "frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'"]) expect(csp, d).toContain(d);
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval|\*/);
  });
});
